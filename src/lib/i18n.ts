// UI-Sprache folgt dem Betriebssystem/Browser (Accept-Language), nicht einer
// Nutzereinstellung — Quince hat keinen Account, an dem man sowas festmachen
// könnte (siehe hooks.server.ts). Rezeptinhalte selbst werden nie übersetzt,
// die bleiben in der Sprache, in der sie importiert wurden.

export type Locale = 'de' | 'en';

const de = {
	navAbout: 'Über Quince',
	navUpload: 'Rezept hochladen',

	homeEmptyTitle: 'Noch keine Rezepte hier',
	homeEmptyBody: 'Lade dein erstes .melarecipe hoch, um loszulegen.',
	homeEmptyTitleReadOnly: 'Rezept ansehen',
	homeEmptyBodyReadOnly:
		'Diese Instanz speichert nichts dauerhaft. Lade eine .melarecipe-Datei hoch, um sie anzusehen — sie bleibt nur für diese Sitzung im Speicher.',

	uploadTitle: 'Rezept hochladen',
	uploadHint:
		'Wähle eine .melarecipe-Datei oder ein ganzes .melarecipes-Archiv aus deiner Mela-Bibliothek aus.',
	uploadHintReadOnly:
		'Wähle eine .melarecipe-Datei oder ein .melarecipes-Archiv zum Ansehen aus. Nichts wird dauerhaft gespeichert.',
	uploadButton: 'Hochladen',
	uploadButtonBusy: 'Wird hochgeladen …',
	uploadErrorNoFile: 'Bitte wähle eine Datei aus.',

	errorInvalidJsonObject: 'Die Datei enthält kein gültiges JSON-Objekt.',
	errorMissingTitle: 'Der Datei fehlt ein Rezepttitel ("title").',
	errorImagesNotArray: '"images" muss ein Array sein.',
	errorCategoriesNotArray: '"categories" muss ein Array sein.',
	errorArchiveUnreadable: 'Das Archiv konnte nicht gelesen werden.',
	errorArchiveEmpty: 'Das Archiv enthält keine lesbaren Rezepte.',
	errorInvalidJson: 'Die Datei enthält kein gültiges JSON.',
	errorInvalidStorageId: 'Ungültige Rezept-ID.',

	errorRecipeNotFound: 'Rezept nicht gefunden',
	errorInvalidImageIndex: 'Ungültiger Bildindex',
	errorImageNotFound: 'Bild nicht gefunden',

	metaServings: 'Portionen',
	metaPrep: 'Vorbereitung',
	metaCook: 'Kochzeit',
	metaTotal: 'Gesamtzeit',
	favorite: 'Favorit',
	wantToCook: 'Möchte ich kochen',
	categoryAddPlaceholder: '+ Kategorie',
	categoryRemoveTitle: 'Kategorie entfernen',
	startCookMode: 'Kochen',
	exportRecipe: 'Exportieren',
	print: 'Drucken',
	ingredients: 'Zutaten',
	instructions: 'Zubereitung',
	notes: 'Notizen',
	nutrition: 'Nährwerte',
	source: 'Quelle',

	errorCategoryMissing: 'Kategoriename fehlt.',
	errorCategoryComma: 'Kategorienamen dürfen kein Komma enthalten.',
	errorCategoryTooLong: 'Kategorienamen dürfen höchstens {max} Zeichen lang sein.',

	scaleLess: 'Weniger Portionen',
	scaleMore: 'Mehr Portionen',
	scaleReset: 'Portionsgröße zurücksetzen auf 1×',

	searchPlaceholder: 'Nach Name oder Tag suchen …',
	searchAriaLabel: 'Rezepte durchsuchen',
	filterAll: 'Alle',
	filterFavorites: 'Favoriten',
	filterWantToCook: 'Vorgemerkt',
	categoryFilterAll: 'Alle Kategorien',
	categoryFilterAriaLabel: 'Nach Kategorie filtern',
	noResults: 'Nichts gefunden.',
	recipeCountToggle: 'Rezepte ({count})',
	hideRecipes: 'Rezepte ausblenden',

	cookModeTitle: 'Kochmodus – {title}',
	backToRecipe: '← Zurück zum Rezept',
	previousStep: 'Vorheriger Schritt',
	nextStep: 'Nächster Schritt',
	addTimer: '+ Timer hinzufügen',
	timerLabel: 'Timer {n}',
	removeTimer: 'Timer {n} entfernen',
	hours: 'Std',
	minutes: 'Min',
	seconds: 'Sek',
	start: 'Start',
	pause: 'Pause',
	reset: 'Zurücksetzen',
	stepperLess: 'Eine Minute weniger, gedrückt halten für Fünf-Minuten-Schritte',
	stepperMore: 'Eine Minute mehr, gedrückt halten für Fünf-Minuten-Schritte',
	noTimers: 'Noch keine Timer. Füge einen hinzu oder tippe im Text auf eine Zeitangabe.',
	pulseToggle: 'Bildschirm bei Timer-Ende wabern lassen (für Hörgeschädigte)',
	alarmText: 'Timer fertig! Antippen zum Stoppen.',
	noSteps: 'Dieses Rezept hat keine Zubereitungsschritte.'
} as const;

const en: Record<keyof typeof de, string> = {
	navAbout: 'About Quince',
	navUpload: 'Upload Recipe',

	homeEmptyTitle: 'No recipes yet',
	homeEmptyBody: 'Upload your first .melarecipe to get started.',
	homeEmptyTitleReadOnly: 'View a recipe',
	homeEmptyBodyReadOnly:
		"This instance doesn't store anything permanently. Upload a .melarecipe file to view it — it only stays in memory for this session.",

	uploadTitle: 'Upload Recipe',
	uploadHint: 'Choose a .melarecipe file or a whole .melarecipes archive from your Mela library.',
	uploadHintReadOnly:
		'Choose a .melarecipe file or a .melarecipes archive to view. Nothing is stored permanently.',
	uploadButton: 'Upload',
	uploadButtonBusy: 'Uploading …',
	uploadErrorNoFile: 'Please choose a file.',

	errorInvalidJsonObject: 'The file does not contain a valid JSON object.',
	errorMissingTitle: 'The file is missing a recipe title ("title").',
	errorImagesNotArray: '"images" must be an array.',
	errorCategoriesNotArray: '"categories" must be an array.',
	errorArchiveUnreadable: 'The archive could not be read.',
	errorArchiveEmpty: 'The archive does not contain any readable recipes.',
	errorInvalidJson: 'The file does not contain valid JSON.',
	errorInvalidStorageId: 'Invalid recipe ID.',

	errorRecipeNotFound: 'Recipe not found',
	errorInvalidImageIndex: 'Invalid image index',
	errorImageNotFound: 'Image not found',

	metaServings: 'Servings',
	metaPrep: 'Prep',
	metaCook: 'Cook time',
	metaTotal: 'Total time',
	favorite: 'Favorite',
	wantToCook: 'Want to Cook',
	categoryAddPlaceholder: '+ Category',
	categoryRemoveTitle: 'Remove category',
	startCookMode: 'Cook',
	exportRecipe: 'Export',
	print: 'Print',
	ingredients: 'Ingredients',
	instructions: 'Instructions',
	notes: 'Notes',
	nutrition: 'Nutrition',
	source: 'Source',

	errorCategoryMissing: 'Category name is missing.',
	errorCategoryComma: 'Category names cannot contain a comma.',
	errorCategoryTooLong: 'Category names can be at most {max} characters long.',

	scaleLess: 'Fewer servings',
	scaleMore: 'More servings',
	scaleReset: 'Reset serving size to 1×',

	searchPlaceholder: 'Search by name or tag …',
	searchAriaLabel: 'Search recipes',
	filterAll: 'All',
	filterFavorites: 'Favorites',
	filterWantToCook: 'Want to Cook',
	categoryFilterAll: 'All categories',
	categoryFilterAriaLabel: 'Filter by category',
	noResults: 'Nothing found.',
	recipeCountToggle: 'Recipes ({count})',
	hideRecipes: 'Hide recipes',

	cookModeTitle: 'Cook Mode – {title}',
	backToRecipe: '← Back to recipe',
	previousStep: 'Previous step',
	nextStep: 'Next step',
	addTimer: '+ Add timer',
	timerLabel: 'Timer {n}',
	removeTimer: 'Remove timer {n}',
	hours: 'Hr',
	minutes: 'Min',
	seconds: 'Sec',
	start: 'Start',
	pause: 'Pause',
	reset: 'Reset',
	stepperLess: 'One minute less, hold to accelerate to five-minute steps',
	stepperMore: 'One minute more, hold to accelerate to five-minute steps',
	noTimers: 'No timers yet. Add one, or tap a time mentioned in the text.',
	pulseToggle: 'Pulse the screen when a timer ends (for the hard of hearing)',
	alarmText: "Timer's done! Tap to stop.",
	noSteps: 'This recipe has no preparation steps.'
};

export const translations = { de, en };

export type TranslationKey = keyof typeof de;

export function t(
	locale: Locale,
	key: TranslationKey,
	vars?: Record<string, string | number>
): string {
	let str: string = translations[locale][key] ?? translations.en[key] ?? key;
	if (vars) {
		for (const [name, value] of Object.entries(vars)) {
			str = str.replaceAll(`{${name}}`, String(value));
		}
	}
	return str;
}
