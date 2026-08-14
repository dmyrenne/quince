import { error } from '@sveltejs/kit';
import { getRecipeFileContents } from '$lib/server/store';
import { t } from '$lib/i18n';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const content = await getRecipeFileContents(params.id);
	if (content === null) error(404, t(locals.locale, 'errorRecipeNotFound'));

	const filename = `${params.id}.melarecipe`;
	// HTTP-Header dürfen nur Latin1 enthalten — Umlaute im Dateinamen (die
	// storageId erlaubt sie) würden die Response sonst mit einem
	// "ByteString"-Fehler zum Absturz bringen. filename ist deshalb ein
	// ASCII-Fallback, filename* (RFC 5987) trägt den echten Namen korrekt kodiert.
	const combiningMarks = new RegExp('[\\u0300-\\u036f]', 'g');
	const asciiFilename = filename
		.normalize('NFKD')
		.replace(combiningMarks, '')
		.replace(/[^\x20-\x7e]/g, '_');

	return new Response(content, {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
		}
	});
};
