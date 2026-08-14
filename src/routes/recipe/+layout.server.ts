import { listRecipes } from '$lib/server/store';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	return { recipes: await listRecipes() };
};
