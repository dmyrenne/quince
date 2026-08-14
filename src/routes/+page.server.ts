import { redirect } from '@sveltejs/kit';
import { listRecipes } from '$lib/server/store';
import { recipeUrl } from '$lib/urls';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const recipes = await listRecipes();
	// Direkt ins zuletzt hinzugefügte Rezept — die Bibliothek selbst liegt in der
	// Seitenleiste, es braucht keine eigene Übersichtsseite.
	if (recipes.length > 0) redirect(307, recipeUrl(recipes[0].storageId));
	return {};
};
