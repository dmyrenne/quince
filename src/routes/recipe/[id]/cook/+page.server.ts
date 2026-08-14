import { error } from '@sveltejs/kit';
import { getRecipe } from '$lib/server/store';
import { t } from '$lib/i18n';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const recipe = await getRecipe(params.id);
	if (!recipe) error(404, t(locals.locale, 'errorRecipeNotFound'));

	// Der Kochmodus braucht keine Fotos, nur Titel/Zutaten/Zubereitung.
	return { recipe: { ...recipe, images: undefined } };
};
