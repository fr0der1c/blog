import React from 'react';
import styled from 'styled-components';
import Img from 'gatsby-image';
import Lightbox from 'react-images';
import TrackVisibility from 'react-on-screen';

import Markdown from '../../markdown';
import theme from '../../../theme';
import {QardProps} from '../base';
import {HTMLDivProps} from '@blueprintjs/core';

interface StyledImageProps {
	lightbox?: boolean;
}

const StyledImage = styled.figure`
	img {
		margin: 0;
	}
	
	&.layout {
		 overflow: hidden;
		 
		img {
			cursor: ${(props: StyledImageProps) => props.lightbox ? 'pointer' : 'default'};
		}
		
		&.left-aligned {
			float: left;
			display: inline-block;
			margin: 0 20px 0 0;
			max-width: 60%;
		}
		
		&.break-out {
			margin: 0 -40px;
		}
		
		&.full-width, &.screen-width {
			width: 100%;
		}
		
		figcaption {
			font-size: .9rem;
			color: ${theme.color(['lightText'])};
			padding: 8px 0;
			line-height: 1rem;
			text-align: center;
		}
		
		@media screen and (max-width: ${theme.main.breakpoints.medium}em) {
			&.full-width, &.screen-width, &.break-out {
				width: 100%;
			}
		}
	}
`;

export interface CardImageType extends QardProps {
	alt: string;
	src?: string;

	fluid?: {
		tracedSVG: any;
		aspectRatio: any;
		originalImg: string;
		src: any;
		srcSet: any;
		sizes: any;
	};

	fixed?: {
		width: number;
		height: number;
		tracedSVG: any;
		aspectRatio: any;
		src: any;
		srcSet: any;
	};
}

/**
 * This renders an image. If a `src` param is specified it will render
 * a normal img tag without doing anything special because sometimes
 * we need a plain and simple image rendered (netlify cms). If src is
 * not specified this component expects params that are required by
 * Gatsby's own `Img` component.
 *
 * This component should be used in every place where an image needs
 * to be rendered.
 */
const QardImage = ({alt, src, ...rest}: CardImageType) => {
	return (src && !rest.fluid && !rest.fixed) ? <img src={src} alt={alt} {...rest}/> : <Img {...Object.assign(
		rest, {alt},
	)}/>;
};

export interface ContentImageType extends CardImageType {
	layout?: string;
	caption?: string;

	//	When false, we won't be rendering a lightbox to open the image
	lightbox?: boolean;

	//	If we want the image to be contained within a link
	href?: string;
}

interface State {
	lightboxOpen: boolean;
	currentImage: number;
}

/**
 * This one extends the basic image component and should be used within
 * the actual content where it supports more options (layout, lightbox)
 */
export class QardImageContent extends React.Component<ContentImageType & HTMLDivProps, State> {
	state = {
		lightboxOpen: false,
		currentImage: 0,
	};

	findImageFromPost(imageSrc: string) {
		const {post} = this.props;

		for (let i = 0; i < post.fields.images.length; i++) {
			const item = post.fields.images[i];

			if (imageSrc.indexOf(item.image.fileName) != -1) {
				return item.image.image;
			}
		}
	}

	render() {
		const {caption, lightbox, layout, fluid, fixed, alt, src, href, post, ...rest} = this.props;

		const images = [{
			caption: caption || alt,
			src    : (fluid || fixed) ? (fluid ? fluid.src : (fixed ? fixed.src : src)) : src,
			srcSet : (fluid || fixed) ? (fluid ? fluid.srcSet : (fixed ? fixed.srcSet : null)) : null,
		}];

		if (!images.length || !images[0].src) {
			return <div/>;
		}

		let imgProp: CardImageType = {
			alt: alt,
			src: images[0].src,
		};

		if (fluid) {
			imgProp.fluid = fluid;
		} else {
			if (fixed) {
				imgProp.fixed = fixed;
			}
		}

		//	if we have a post...this image must be pulled from the `images` field (GraphQl)
		if (post) {
			const postImage = this.findImageFromPost(imgProp.src);

			if (postImage) {
				imgProp = Object.assign(imgProp, postImage);
			}
		}

		const img = <StyledImage
			lightbox={lightbox} {...rest}
			onClick={() => this.setState({lightboxOpen: true})}
			className={`layout ${layout}`}>

			<TrackVisibility once>
				<QardImage {...imgProp}/>
			</TrackVisibility>

			{lightbox && <Lightbox
				images={images}
				isOpen={this.state.lightboxOpen}
				backdropClosesModal={true}
				onClose={() => this.setState({lightboxOpen: false})}
			/>}

			{caption && <div className="alt">
				<Markdown component={'figcaption'} md={caption}/>
			</div>}
		</StyledImage>;

		if (href) {
			return <a href={href} target="_blank">{img}</a>;
		}
		return img;
	}
}

export default QardImage;
