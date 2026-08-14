import { resolve } from '$app/paths';

// Die storageId ist der Dateiname und darf damit Leerzeichen, Umlaute oder
// Gedankenstriche enthalten — SvelteKits resolve() setzt Parameter unverändert
// ein, deshalb kodieren wir hier selbst. Ohne das scheitert schon ein Redirect
// am Location-Header.
export function recipeUrl(storageId: string): string {
	return resolve('/recipe/[id]', { id: encodeURIComponent(storageId) });
}

export function recipeImageUrl(storageId: string, index: number): string {
	return resolve('/recipe/[id]/image/[index]', {
		id: encodeURIComponent(storageId),
		index: String(index)
	});
}
