import { error, fail } from '@sveltejs/kit';
import { getRecipe, updateRecipeMeta } from '$lib/server/store';
import { t } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

const MAX_CATEGORY_LENGTH = 60;

export const load: PageServerLoad = async ({ params, locals }) => {
	const recipe = await getRecipe(params.id);
	if (!recipe) error(404, t(locals.locale, 'errorRecipeNotFound'));

	// Die Bilder selbst kommen über /recipe/[id]/image/[index] — sie hier als
	// Data-URLs mitzuschicken würde die Seite um Hunderte KB aufblähen.
	const { images, ...withoutImages } = recipe;
	return {
		recipe: { ...withoutImages, imageCount: images?.length ?? 0 }
	};
};

export const actions: Actions = {
	toggleFavorite: async ({ params, locals }) => {
		const recipe = await getRecipe(params.id);
		if (!recipe) error(404, t(locals.locale, 'errorRecipeNotFound'));
		await updateRecipeMeta(params.id, { favorite: !recipe.favorite });
	},

	toggleWantToCook: async ({ params, locals }) => {
		const recipe = await getRecipe(params.id);
		if (!recipe) error(404, t(locals.locale, 'errorRecipeNotFound'));
		await updateRecipeMeta(params.id, { wantToCook: !recipe.wantToCook });
	},

	addCategory: async ({ params, request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('category') ?? '').trim();
		if (!name) return fail(400, { error: t(locals.locale, 'errorCategoryMissing') });
		if (name.includes(',')) return fail(400, { error: t(locals.locale, 'errorCategoryComma') });
		// Das Eingabefeld begrenzt schon, aber ein POST muss nicht aus dem Formular
		// kommen — ohne Prüfung landet hier beliebig viel Text in der Rezeptdatei.
		if (name.length > MAX_CATEGORY_LENGTH) {
			return fail(400, {
				error: t(locals.locale, 'errorCategoryTooLong', { max: MAX_CATEGORY_LENGTH })
			});
		}

		const recipe = await getRecipe(params.id);
		if (!recipe) error(404, t(locals.locale, 'errorRecipeNotFound'));
		const categories = Array.from(new Set([...(recipe.categories ?? []), name]));
		await updateRecipeMeta(params.id, { categories });
	},

	removeCategory: async ({ params, request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('category') ?? '');

		const recipe = await getRecipe(params.id);
		if (!recipe) error(404, t(locals.locale, 'errorRecipeNotFound'));
		const categories = (recipe.categories ?? []).filter((category) => category !== name);
		await updateRecipeMeta(params.id, { categories });
	}
};
