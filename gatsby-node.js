require('typescript-require');

const _ = require('lodash');
const fs = require('fs');
const ncp = require('ncp').ncp;
const Promise = require('bluebird');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const base64 = require('js-base64').Base64;
const { createFilePath } = require('gatsby-source-filesystem');

const postsSettings = require('./static/config/posts.json');
const siteSettings = require('./static/config/settings.json');

const postTemplate = path.resolve('./src/templates/post/index.tsx');
const postsTemplate = path.resolve('./src/templates/posts/index.tsx');
const tagTemplate = path.resolve('./src/templates/tag/index.tsx');
const categoryTemplate = path.resolve('./src/templates/category/index.tsx');

const getTags = (edges) => {
	const tags = [];

	_.each(edges, (edge) => {
		if (_.get(edge, 'node.frontmatter.tags')) {
			for (let i = 0; i < edge.node.frontmatter.tags.length; i++) {
				tags.push(edge.node.frontmatter.tags[i]);
			}
		}
	});

	return tags;
};

const paginatePosts = (createPage, postsEdges) => {
	const pathPrefix = postsSettings.pathPrefix || 'posts';

	const filterOutPages = (edges) => {
		const filteredPosts = [];
		edges.map((post) => {
			//	We need to filter out from pagination the default post also (supported cards)
			if (post.node.frontmatter.isPage !== true && post.node.fileAbsolutePath.indexOf('static/content/collections/posts') !== -1) {
				filteredPosts.push(post);
			}
		});
		return filteredPosts;
	};

	//	Setup pagination but start with filtering out the
	//	posts that are pages otherwise we will have more pagination
	//	pages and the template will fail to recognize some
	const posts = filterOutPages(postsEdges);
	const postsPerPage = 6;

	const numPages = Math.ceil(posts.length / postsPerPage);

	_.times(numPages, i => {
		createPage({
			path: i === 0 ? `${pathPrefix}` : `${pathPrefix}/${i + 1}`,
			component: postsTemplate,
			context: {
				limit: postsPerPage,
				skip: i * postsPerPage,
				numPages,
				currentPage: i + 1,
			},
		});
	});

	// Create posts and pages.
	_.each(postsEdges, (edge, index) => {
		const slug = edge.node.fields.slug;
		const previous = index === postsEdges.length - 1 ? null : postsEdges[index + 1].node;
		const next = index === 0 ? null : postsEdges[index - 1].node;

		// create posts
		createPage({
			path: slug,
			component: postTemplate,
			context: {
				slug,
				previous,
				next,
				tags      : edge.node.frontmatter.tags,
				categories: edge.node.frontmatter.categories,
			},
		});
	});
};

const paginateTags = (createPage, posts) => {
	//	Setup pagination
	const tags = _.uniq(getTags(posts));

	if (tags.length <= 0) return;

	const getPostsByTag = (tag) => {
		const postsByTag = [];
		posts.map((post) => {
			const p = post.node;

			if (p.frontmatter.tags && p.frontmatter.tags.length > 0 && p.frontmatter.tags.includes(tag)) {
				postsByTag.push(p.node);
			}
		});
		return postsByTag;
	};

	const paginateTag = (tag) => {
		const postsPerPage = 6;
		const tagPosts = getPostsByTag(tag);
		const numPages = Math.ceil(tagPosts.length / postsPerPage);
		const slug = slugify(tag);

		_.times(numPages, i => {
			createPage({
				path: i === 0 ? `tag/${slug}` : `tag/${slug}/${i + 1}`,
				component: tagTemplate,
				context: {
					limit: postsPerPage,
					skip: i * postsPerPage,
					numPages,
					currentPage: i + 1,
					tag,
					slug,
				},
			});
		});
	};

	//	Make tag pages
	tags.forEach(paginateTag);
};

const paginateCategories = (createPage, posts, categories) => {
	if (categories.length <= 0) return;

	const getPostsByCategory = (category) => {
		const postsByCategory = [];
		posts.map((post) => {
			const p = post.node;

			if (p.frontmatter.categories === category.frontmatter.title) {
				postsByCategory.push(p.node);
			}
		});
		return postsByCategory;
	};

	_.uniqBy(categories, 'node.id').forEach((category) => {
		const c = category.node;
		const postsPerPage = 6;
		const categoryPosts = getPostsByCategory(c);
		const numPages = Math.ceil(categoryPosts.length / postsPerPage);
		const slug = c.fields.slug;

		if (categoryPosts.length > 0) {
			_.times(numPages, i => {
				createPage({
					path: i === 0 ? slug : `${slug}${i + 1}`,
					component: categoryTemplate,
					context: {
						limit: postsPerPage,
						skip: i * postsPerPage,
						numPages,
						currentPage: i + 1,
						category: c,
						slug,
					},
				});
			});
		} else {
			//	the navbar component does a query on the categories but it can't know
			//	if the results have any posts in them so we have to make a page even if
			//	there will be no results to be shown
			createPage({
				path: slug,
				component: categoryTemplate,
				context: {
					limit: postsPerPage,
					skip: 0,
					numPages,
					currentPage: 1,
					category: c,
					slug,
				},
			});
		}
	});
};

exports.createPages = ({ graphql, actions }) => {
	const { createPage } = actions;

	return new Promise((resolve, reject) => {
		resolve(
			graphql(`
				{
					posts: allMarkdownRemark(filter: {fileAbsolutePath: {regex: "//collections/posts//"}}) {
						edges {
							node {
								fields{
									slug
								}
								frontmatter {
									tags
									isPage
									created_at
									categories
								}
								fileAbsolutePath
							}
						}
					}
					
					categories: allMarkdownRemark(filter: {fileAbsolutePath: {regex: "//collections/categories//"}}) {
						edges {
							node {
								id
								fields{
									slug
								}
								frontmatter {
									title
								}
							}
						}
					}
				}
			`).then((result) => {
				if (result.errors) {
					console.error(result.errors);
					reject(result.errors);
				}

				const postsEdges = result.data.posts.edges;
				const categoriesEdges = result.data.categories.edges;

				paginatePosts(createPage, postsEdges);
				paginateTags(createPage, postsEdges);
				paginateCategories(createPage, postsEdges, categoriesEdges);
			}),
		);
	});
};

const isNodeOfCollection = (node, collection) => node.internal.type === 'MarkdownRemark' &&
	node.fileAbsolutePath.match(`collections/${collection}`);

//	Will return only nodes that are from a given collection
const getCollectionNodes = (collection, getNodes) => {
	return getNodes().filter(node => isNodeOfCollection(node, collection)) || [];
};

//	Given a post node, returns the node of the author
const getPostAuthorNode = (postNode, getNodes) => {
	return getCollectionNodes('authors', getNodes).find(node => {
		return node.frontmatter.title === postNode.frontmatter.authors;
	});
};

//	Given a post node, returns the node of the category
const getPostCategoryNode = (postNode, getNodes) => {
	return getCollectionNodes('categories', getNodes).find(node => {
		return node.frontmatter.title === postNode.frontmatter.categories;
	});
};

const mapCategoriesToPostNode = (node, getNodes) => {
	const category = getPostCategoryNode(node, getNodes);

	//	Netlify CMS does not (yet) support one to many relationships
	//	but we're adding an array to avoid introducing breaking changes
	//	once they do and we have to adapt
	if (category) node.categories___NODES = [category.id];
};

const mapAuthorsToPostNode = (node, getNodes) => {
	const author = getPostAuthorNode(node, getNodes);

	//	Same as above...an array is created
	if (author) node.authors___NODES = [author.id];
};

const slugify = (text) => {
	return text.toString().toLowerCase()
		.replace(/\s+/g, '-')           // Replace spaces with -
		.replace(/[^\w\-]+/g, '')       // Remove all non-word chars
		.replace(/\-\-+/g, '-')         // Replace multiple - with single -
		.replace(/^-+/, '')             // Trim - from start of text
		.replace(/-+$/, '');            // Trim - from end of text
};

/**
 *    Netlify cms supports custom slugs but not fully
 *    For example you can't add a slug config like: {{year}}/{{month}}/{{day}}
 *    and expect for it to work because the slashes will get replaced with
 *    dashes since Netlify CMS does NOT know how to deal with subfolders
 *    For a new blog this is not a big deal but it might be for a blog that
 *    is being imported from Wordpress which has this type of urls (I know
 *    because I faced this issue). The solution is to create the slug here
 */
const createFinalSlug = (post, slug) => {
	//	based on the posts settings
	const slugConfig = postsSettings.slugStructure;

	//	SUPPORTED TOKENS
	//
	// {{slug}}:   a url-safe version of the title field for the file
	// {{year}}:   4-digit year of the file creation date
	// {{month}}:  2-digit month of the file creation date
	// {{day}}:    2-digit day of the month of the file creation date
	// {{hour}}:   2-digit hour of the file creation date
	// {{minute}}: 2-digit minute of the file creation date
	// {{second}}: 2-digit second of the file creation date
	const dt = new Date(post.frontmatter.created_at);
	const mo = ('0' + (dt.getMonth() + 1)).slice(-2);
	const day = ('0' + dt.getDate()).slice(-2);
	const year = dt.getFullYear();
	const hour = dt.getHours();
	const minute = dt.getMinutes();
	const second = dt.getSeconds();

	return `/${slugConfig}/`
		.replace('{{slug}}', slug)
		.replace('{{year}}', year)
		.replace('{{month}}', mo)
		.replace('{{day}}', day)
		.replace('{{hour}}', hour)
		.replace('{{minute}}', minute)
		.replace('{{second}}', second)
		//	replace double slashes with a single one
		.replace(/\/+/g, '/');
};

//	Creates a mapping between posts and authors, sets the slug
//	and other required attributes
exports.sourceNodes = ({ actions, getNodes, getNode }) => {
	const { createNodeField } = actions;

	getCollectionNodes('categories', getNodes).forEach(node => {
		createNodeField({ node, name: 'slug', value: `category${createFilePath({ node, getNode })}` });
	});

	getCollectionNodes('posts', getNodes).forEach(node => {
		mapAuthorsToPostNode(node, getNodes);
		mapCategoriesToPostNode(node, getNodes);

		//	create the post slug
		const slugPath = createFilePath({ node, getNode });
		createNodeField({ node, name: 'slug', value: createFinalSlug(node, slugPath) });
	});
};

const createReferencesField = (node, actions, getNodes) => {
	const cPattern = /{"widget":"([a-zA-Z0-9-]+)","config":"(.*?)"}/;

	function decodeWidgetDataObject(data) {
		return JSON.parse(base64.decode(data));
	}

	if (!node.rawMarkdownBody) return;

	const references = [];

	node.rawMarkdownBody.split('\n').map(line => {
		if (RegExp(cPattern).test(line)) {
			const params = line.match(cPattern);
			const widget = params[1];
			const config = decodeWidgetDataObject(params[2]);

			if (widget === 'qards-reference') {
				//	find the post that is referenced based on title
				//	TODO: check back with Netlify CMS and see if they made it possible to
				//	put an id in the valueField or a slug because the `title` field can
				//	change at any time and it's only a matter of time before we get into
				//	trouble with missing referenced posts
				getCollectionNodes('posts', getNodes).forEach(searchNode => {
					//	this title match is inneficient! See above
					if (searchNode.frontmatter.title === config.reference) {
						references.push(searchNode.id);
					}
				});
			}
		}
	});

	node.references___NODES = references;
};

exports.onCreateWebpackConfig = ({ stage, actions }) => {
	const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

	if (stage === 'build-javascript') {
		// Turn off source maps
		actions.setWebpackConfig({
			devtool: false,
		});
	}

	actions.setWebpackConfig({
		plugins: [
			new MomentLocalesPlugin(),
		],
	});
};

exports.onPreBootstrap = () => {
	//	See gatsby-browser.js to learn why we do this
	const customfontsDir = './public/custom-fonts';
	const performanceMode = siteSettings.performanceMode;

	const writeEmptyFile = () => {
		return new Promise((resolve, reject) => {
			mkdirp(customfontsDir, (err) => {
				if (err) {
					reject(err);
				} else {
					//	write an empty file because we can't conditionally import inside gatsby-browser
					fs.writeFile('./public/custom-fonts/index.css', '', (err) => {
						if (err) {
							reject(err);
						}
						resolve();
					});
				}
			});
		});
	};

	const loadCustomFonts = () => {
		const fontNpmPackage = siteSettings.typography.npmPackage;

		writeEmptyFile().then(() => {
			if (fontNpmPackage) {
				ncp.limit = 16;

				mkdirp(customfontsDir, (err) => {
					if (err) {
						console.error('unable to create custom fonts folder');
						throw err;
					} else {
						if (!performanceMode) {
							ncp(`node_modules/${fontNpmPackage}`, customfontsDir, (err) => {
								if (err) {
									console.error('unable to copy font package');
									throw err;
								}
							});
						} else {
							console.warn('Performance mode: external font will not be loaded!');
						}
					}
				});
			}
		}).catch((err) => {
			throw err;
		});
	};

	//	Ensure a clean copy of the custom fonts dir
	if (fs.existsSync(customfontsDir)) {
		rimraf(customfontsDir, {}, loadCustomFonts);
	} else {
		loadCustomFonts();
	}
};

//	Creates a `references` field that holds the references to other posts
exports.onCreateNode = async ({ node, actions, getNodes }) => {
	if (isNodeOfCollection(node, 'posts')) createReferencesField(node, actions, getNodes);
};

//	Netlify cms fix for netlify deploys?
module.exports.resolvableExtensions = () => ['.json'];
