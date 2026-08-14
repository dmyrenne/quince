// Mirrors the .melarecipe JSON schema, see https://mela.recipes/fileformat/index.html
export interface MelaRecipe {
	id: string;
	title: string;
	text?: string;
	categories?: string[];
	yield?: string;
	prepTime?: string;
	cookTime?: string;
	totalTime?: string;
	ingredients?: string;
	instructions?: string;
	notes?: string;
	nutrition?: string;
	link?: string;
	images?: string[];
	// Present in real Mela exports but ignored on import, per the spec.
	favorite?: boolean;
	wantToCook?: boolean;
	date?: number;
}

export interface RecipeSummary {
	storageId: string;
	title: string;
	categories: string[];
	favorite: boolean;
	wantToCook: boolean;
	yield?: string;
	totalTime?: string;
	imageCount: number;
	/** Änderungszeit der Datei — bestimmt, welches Rezept "das letzte" ist. */
	updatedAt: number;
}

export interface IngredientGroup {
	title?: string;
	items: string[];
}

export interface InstructionGroup {
	title?: string;
	steps: string[];
}
