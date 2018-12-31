import * as cmsUtils from '../../src/cms/utils';

test('[decodeWidgetDataObject] should properly decode encoded widget', () => {
	expect(cmsUtils.decodeWidgetDataObject(
		'eyJ0aXRsZSI6IkF1ZGlvIHBsYXlsaXN0Iiwic3VidGl0bGUiOiJBbiBhdWRpbyBwbGF5bGlzdCBjYW4gY29udGFpbiBvbmUgb3IgbXVsdGlwbGUgYXVkaW8gZmlsZXMiLCJ0eXBlIjoicHJpbWFyeSJ9')).toEqual(
		{
			'title'   : 'Audio playlist',
			'subtitle': 'An audio playlist can contain one or multiple audio files',
			'type'    : 'primary',
		});
});

test('[encodeWidgetDataObject] should properly encode widget data', () => {
	expect(cmsUtils.encodeWidgetDataObject({
		'title'   : 'Audio playlist',
		'subtitle': 'An audio playlist can contain one or multiple audio files',
		'type'    : 'primary',
	})).toEqual(
		'eyJ0aXRsZSI6IkF1ZGlvIHBsYXlsaXN0Iiwic3VidGl0bGUiOiJBbiBhdWRpbyBwbGF5bGlzdCBjYW4gY29udGFpbiBvbmUgb3IgbXVsdGlwbGUgYXVkaW8gZmlsZXMiLCJ0eXBlIjoicHJpbWFyeSJ9');
});
