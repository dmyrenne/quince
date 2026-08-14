import { fail, redirect } from '@sveltejs/kit';
import { InvalidRecipeError, saveUpload } from '$lib/server/store';
import { recipeUrl } from '$lib/urls';
import { t } from '$lib/i18n';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: t(locals.locale, 'uploadErrorNoFile') });
		}

		let imported: string[];
		try {
			imported = await saveUpload(new Uint8Array(await file.arrayBuffer()), file.name);
		} catch (err) {
			if (err instanceof InvalidRecipeError) {
				return fail(400, { message: t(locals.locale, err.translationKey) });
			}
			throw err;
		}

		// Bei einem Bündel landet man auf dem zuletzt importierten Rezept, die
		// übrigen stehen in der Seitenleiste.
		redirect(303, recipeUrl(imported[imported.length - 1]));
	}
};
