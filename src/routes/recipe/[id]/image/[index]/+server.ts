import { error } from '@sveltejs/kit';
import { getRecipeImage } from '$lib/server/store';
import { t } from '$lib/i18n';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const index = Number(params.index);
	if (!Number.isInteger(index) || index < 0) error(400, t(locals.locale, 'errorInvalidImageIndex'));

	const image = await getRecipeImage(params.id, index);
	if (!image) error(404, t(locals.locale, 'errorImageNotFound'));

	return new Response(image.bytes, {
		headers: {
			'content-type': image.mime,
			'content-length': String(image.bytes.byteLength),
			'cache-control': 'public, max-age=3600'
		}
	});
};
