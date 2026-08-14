import { env } from '$env/dynamic/private';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { cacheRecipe, getCachedRecipe } from './ephemeralStore';
import type { TranslationKey } from '$lib/i18n';
import type { MelaRecipe, RecipeSummary } from '$lib/types';

const DATA_DIR = env.DATA_DIR || path.join(process.cwd(), 'data');
const RECIPES_DIR = path.join(DATA_DIR, 'recipes');
/** Bereits ausgepackte `.melarecipes`-Bündel werden hierhin verschoben. */
const IMPORTED_DIR = path.join(DATA_DIR, 'imported');

/** Für Deployments ohne Volume/Bind-Mount (z. B. eine öffentliche Demo):
 *  Uploads landen nur im Prozessspeicher (ephemeralStore), nie auf der
 *  Platte, es gibt keine Bibliothek/Seitenleiste. Lässt sich nicht zuverlässig
 *  automatisch erkennen (ein frisches Container-Dateisystem sieht beim Start
 *  identisch aus wie ein gemountetes Volume), deshalb ein expliziter Schalter. */
export const isReadOnly = env.READ_ONLY === 'true';

/** Rezeptdateien enthalten die Fotos als Base64 und sind damit schnell mehrere
 *  hundert KB groß. Die Übersicht braucht davon nur die Metadaten, also parsen
 *  wir eine Datei nur neu, wenn sich ihre Änderungszeit unterscheidet. */
const summaryCache = new Map<string, { mtimeMs: number; summary: RecipeSummary }>();

async function ensureRecipesDir() {
	await mkdir(RECIPES_DIR, { recursive: true });
}

/** Die ID stammt aus der URL und ist damit Nutzereingabe: alles, was den
 *  Rezeptordner verlassen könnte, wird abgelehnt. */
function isSafeStorageId(storageId: string): boolean {
	return (
		storageId.length > 0 &&
		storageId.length <= 200 &&
		!storageId.includes('/') &&
		!storageId.includes('\\') &&
		!storageId.includes('\0') &&
		storageId !== '.' &&
		storageId !== '..'
	);
}

function recipeFilePath(storageId: string) {
	return path.join(RECIPES_DIR, `${storageId}.melarecipe`);
}

/** Macht aus einem Rezept- oder Dateinamen einen brauchbaren Dateinamen. */
function toStorageId(rawName: string): string {
	const base = (rawName.split(/[/\\]/).pop() ?? '').replace(/\.melarecipe$/i, '');
	const cleaned = base
		.replace(/[^\p{L}\p{N} _-]/gu, '')
		.trim()
		.replace(/\s+/g, '-')
		.slice(0, 120);
	return cleaned.length > 0 ? cleaned : randomUUID();
}

async function claimStorageId(preferred: string): Promise<string> {
	let candidate = preferred;
	for (let suffix = 2; ; suffix++) {
		try {
			// wx = anlegen und fehlschlagen, falls schon vorhanden — so kann sich
			// kein zweiter Import denselben Namen schnappen.
			await writeFile(recipeFilePath(candidate), '', { flag: 'wx' });
			return candidate;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
			candidate = `${preferred}-${suffix}`;
		}
	}
}

/** Der Typ wird aus den ersten Bytes bestimmt, nie aus einer Angabe in der
 *  Datei — und was nicht zu einem der vier Bildformate passt, wird gar nicht
 *  erst ausgeliefert. Sonst könnte ein präpariertes Rezept beliebigen Inhalt
 *  (z. B. ein SVG mit Skript) unter einer Bild-URL derselben Origin
 *  unterschieben. `null` heißt: kein Bild, 404. */
function sniffImageMime(head: Uint8Array): string | null {
	if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
	if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47)
		return 'image/png';
	if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return 'image/gif';

	const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to));
	// RIFF....WEBP
	if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';

	// ISO-BMFF: "....ftyp<brand>". Mela kommt von iOS, entsprechend viele Fotos
	// liegen als HEIC vor. Vorher wurden die als image/jpeg ausgeliefert und
	// waren damit in jedem Browser kaputt — mit korrektem Typ zeigt Safari sie
	// an, und der Rest weiß wenigstens, woran er ist (siehe ROADMAP).
	if (ascii(4, 8) === 'ftyp') {
		const brand = ascii(8, 12);
		if (brand === 'avif' || brand === 'avis') return 'image/avif';
		if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'].includes(brand))
			return 'image/heic';
		if (brand === 'mif1' || brand === 'msf1') return 'image/heif';
	}

	return null;
}

/** Bilder werden über einen eigenen Endpoint ausgeliefert statt als Data-URL ins
 *  HTML eingebettet — sonst hinge an jeder Seite die volle Bildlast. */
export async function getRecipeImage(
	storageId: string,
	index: number
): Promise<{ bytes: Uint8Array<ArrayBuffer>; mime: string } | null> {
	if (!Number.isInteger(index) || index < 0) return null;
	const recipe = await getRecipe(storageId);
	const base64 = recipe?.images?.[index];
	if (!base64) return null;

	const bytes = Uint8Array.from(Buffer.from(base64, 'base64'));
	const mime = sniffImageMime(bytes.subarray(0, 12));
	return mime ? { bytes, mime } : null;
}

/** Trägt einen Übersetzungsschlüssel statt eines fertigen Texts, damit die
 *  Fehlermeldung erst dort in die passende Sprache übersetzt wird, wo die
 *  Locale des Requests bekannt ist (die Store-Funktionen selbst kennen sie
 *  nicht). */
export class InvalidRecipeError extends Error {
	constructor(public readonly translationKey: TranslationKey) {
		super(translationKey);
	}
}

/** Minimal structural validation — trusts the rest of the shape, but never lets
 *  through something that isn't at least a plausible Mela recipe. */
export function validateMelaRecipe(data: unknown): MelaRecipe {
	if (typeof data !== 'object' || data === null) {
		throw new InvalidRecipeError('errorInvalidJsonObject');
	}
	const record = data as Record<string, unknown>;
	if (typeof record.title !== 'string' || record.title.trim().length === 0) {
		throw new InvalidRecipeError('errorMissingTitle');
	}
	if (record.images !== undefined && !Array.isArray(record.images)) {
		throw new InvalidRecipeError('errorImagesNotArray');
	}
	if (record.categories !== undefined && !Array.isArray(record.categories)) {
		throw new InvalidRecipeError('errorCategoriesNotArray');
	}
	return {
		id: typeof record.id === 'string' ? record.id : randomUUID(),
		title: record.title,
		text: typeof record.text === 'string' ? record.text : undefined,
		categories: (record.categories as string[] | undefined) ?? [],
		yield: typeof record.yield === 'string' ? record.yield : undefined,
		prepTime: typeof record.prepTime === 'string' ? record.prepTime : undefined,
		cookTime: typeof record.cookTime === 'string' ? record.cookTime : undefined,
		totalTime: typeof record.totalTime === 'string' ? record.totalTime : undefined,
		ingredients: typeof record.ingredients === 'string' ? record.ingredients : undefined,
		instructions: typeof record.instructions === 'string' ? record.instructions : undefined,
		notes: typeof record.notes === 'string' ? record.notes : undefined,
		nutrition: typeof record.nutrition === 'string' ? record.nutrition : undefined,
		link: typeof record.link === 'string' ? record.link : undefined,
		images: (record.images as string[] | undefined) ?? [],
		favorite: record.favorite === true,
		wantToCook: record.wantToCook === true
	};
}

async function writeRecipe(recipe: MelaRecipe, preferredName: string): Promise<string> {
	await ensureRecipesDir();
	const storageId = await claimStorageId(toStorageId(preferredName));
	await writeFile(recipeFilePath(storageId), JSON.stringify(recipe), 'utf-8');
	return storageId;
}

/** Speichert dauerhaft — oder, im READ_ONLY-Modus, nur für diese Prozesslaufzeit. */
function persistOrCache(recipe: MelaRecipe, preferredName: string): Promise<string> {
	return isReadOnly ? Promise.resolve(cacheRecipe(recipe)) : writeRecipe(recipe, preferredName);
}

export async function saveRecipe(data: unknown, fileName = ''): Promise<string> {
	const recipe = validateMelaRecipe(data);
	return persistOrCache(recipe, fileName || recipe.title);
}

/** Ein `.melarecipes`-Bündel ist ein ZIP mit je einer `.melarecipe`-Datei pro Rezept. */
export function isZipBundle(bytes: Uint8Array): boolean {
	return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

/** Ein ZIP kann sich beim Auspacken um Größenordnungen aufblähen ("Zip-Bombe"):
 *  wenige Kilobyte im Upload, viele Gigabyte im Speicher. Da `unzipSync` alles
 *  auf einmal in den RAM legt, wird vor dem Entpacken anhand der im Archiv
 *  angegebenen Originalgrößen gefiltert — ein einzelnes Rezept ist selbst mit
 *  Fotos deutlich kleiner als 64 MB, und eine ganze Bibliothek bleibt unter 1 GB.
 *  Die Grenzen sind großzügig genug, dass echte Mela-Bibliotheken durchgehen. */
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 1024 * 1024 * 1024;

export async function importBundle(bytes: Uint8Array): Promise<string[]> {
	let entries: Record<string, Uint8Array>;
	try {
		let budget = MAX_BUNDLE_BYTES;
		entries = unzipSync(bytes, {
			filter: ({ name, originalSize }) => {
				// Nicht-Rezepte (u. a. macOS-Ressourcegabeln) gar nicht erst auspacken.
				if (!name.toLowerCase().endsWith('.melarecipe')) return false;
				if (name.startsWith('__MACOSX/') || name.split(/[/\\]/).pop()?.startsWith('.'))
					return false;
				if (originalSize > MAX_ENTRY_BYTES || originalSize > budget) return false;
				budget -= originalSize;
				return true;
			}
		});
	} catch {
		throw new InvalidRecipeError('errorArchiveUnreadable');
	}

	const imported: string[] = [];
	for (const [name, content] of Object.entries(entries)) {
		try {
			const recipe = validateMelaRecipe(JSON.parse(new TextDecoder().decode(content)));
			imported.push(await persistOrCache(recipe, name));
		} catch (err) {
			console.warn(`Rezept "${name}" im Archiv wurde übersprungen:`, err);
		}
	}

	if (imported.length === 0) {
		throw new InvalidRecipeError('errorArchiveEmpty');
	}
	return imported;
}

/** Nimmt eine hochgeladene Datei entgegen — einzelnes Rezept oder ganzes Bündel. */
export async function saveUpload(bytes: Uint8Array, fileName = ''): Promise<string[]> {
	if (isZipBundle(bytes)) return importBundle(bytes);

	let data: unknown;
	try {
		data = JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		throw new InvalidRecipeError('errorInvalidJson');
	}
	return [await saveRecipe(data, fileName)];
}

export async function getRecipe(
	storageId: string
): Promise<(MelaRecipe & { storageId: string }) | null> {
	if (isReadOnly) {
		const cached = getCachedRecipe(storageId);
		return cached ? { ...cached, storageId } : null;
	}
	if (!isSafeStorageId(storageId)) return null;
	try {
		const raw = await readFile(recipeFilePath(storageId), 'utf-8');
		return { ...validateMelaRecipe(JSON.parse(raw)), storageId };
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw err;
	}
}

/** Für den `.melarecipe`-Export: die Datei ist bereits valides Mela-Format —
 *  unverändert ausliefern statt neu zu serialisieren, damit kein Feld verloren geht. */
export async function getRecipeFileContents(storageId: string): Promise<string | null> {
	if (isReadOnly) {
		const cached = getCachedRecipe(storageId);
		return cached ? JSON.stringify(cached) : null;
	}
	if (!isSafeStorageId(storageId)) return null;
	try {
		return await readFile(recipeFilePath(storageId), 'utf-8');
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw err;
	}
}

/** Ändert nur Organisations-Metadaten (Favorit, Merkliste, Kategorien) an einem
 *  bereits gespeicherten Rezept — der Rest der Datei bleibt unangetastet.
 *  Im READ_ONLY-Modus gibt es nichts, das dauerhaft geändert werden könnte —
 *  die UI blendet die entsprechenden Buttons dort auch gar nicht erst ein. */
export async function updateRecipeMeta(
	storageId: string,
	patch: Partial<Pick<MelaRecipe, 'favorite' | 'wantToCook' | 'categories'>>
): Promise<void> {
	if (isReadOnly) return;
	if (!isSafeStorageId(storageId)) throw new InvalidRecipeError('errorInvalidStorageId');
	const raw = await readFile(recipeFilePath(storageId), 'utf-8');
	const recipe = { ...validateMelaRecipe(JSON.parse(raw)), ...patch };
	await writeFile(recipeFilePath(storageId), JSON.stringify(recipe), 'utf-8');
}

let pendingImport: Promise<void> | null = null;

/** Packt `.melarecipes`-Bündel aus, die jemand direkt ins Volume gelegt hat, und
 *  legt das Archiv danach unter `data/imported/` ab, damit es nicht erneut
 *  verarbeitet wird. */
async function importDroppedBundles(): Promise<void> {
	const bundles = (await readdir(RECIPES_DIR)).filter((file) =>
		file.toLowerCase().endsWith('.melarecipes')
	);
	if (bundles.length === 0) return;

	await mkdir(IMPORTED_DIR, { recursive: true });
	for (const bundle of bundles) {
		const source = path.join(RECIPES_DIR, bundle);
		try {
			const imported = await importBundle(await readFile(source));
			await rename(source, path.join(IMPORTED_DIR, bundle));
			console.log(`"${bundle}": ${imported.length} Rezepte importiert.`);
		} catch (err) {
			// Nicht erneut versuchen wäre schöner, aber ohne Umbenennen bliebe die
			// Datei sonst unbemerkt liegen — der Fehler landet im Log.
			console.warn(`Archiv "${bundle}" konnte nicht importiert werden:`, err);
			await rename(source, path.join(IMPORTED_DIR, `${bundle}.failed`)).catch(() => {});
		}
	}
}

/** Neueste zuerst — das erste Element ist das "letzte" Rezept.
 *  Im READ_ONLY-Modus gibt es keine Bibliothek: leer, ohne die Platte
 *  überhaupt anzufassen. */
export async function listRecipes(): Promise<RecipeSummary[]> {
	if (isReadOnly) return [];
	await ensureRecipesDir();

	// Nur ein Import gleichzeitig, sonst greifen parallele Requests dasselbe Archiv an.
	pendingImport ??= importDroppedBundles().finally(() => {
		pendingImport = null;
	});
	await pendingImport;

	const files = (await readdir(RECIPES_DIR)).filter((file) => file.endsWith('.melarecipe'));

	const summaries: RecipeSummary[] = [];
	const present = new Set<string>();

	for (const file of files) {
		const storageId = file.replace(/\.melarecipe$/, '');
		present.add(storageId);

		try {
			const { mtimeMs } = await stat(path.join(RECIPES_DIR, file));
			const cached = summaryCache.get(storageId);
			if (cached?.mtimeMs === mtimeMs) {
				summaries.push(cached.summary);
				continue;
			}

			const recipe = validateMelaRecipe(
				JSON.parse(await readFile(path.join(RECIPES_DIR, file), 'utf-8'))
			);
			const summary: RecipeSummary = {
				storageId,
				title: recipe.title,
				categories: recipe.categories ?? [],
				favorite: recipe.favorite ?? false,
				wantToCook: recipe.wantToCook ?? false,
				yield: recipe.yield,
				totalTime: recipe.totalTime,
				imageCount: recipe.images?.length ?? 0,
				updatedAt: mtimeMs
			};
			summaryCache.set(storageId, { mtimeMs, summary });
			summaries.push(summary);
		} catch (err) {
			// Eine kaputte Datei im Volume darf nicht die ganze Bibliothek lahmlegen.
			console.warn(`Rezept "${file}" konnte nicht gelesen werden:`, err);
		}
	}

	for (const storageId of summaryCache.keys()) {
		if (!present.has(storageId)) summaryCache.delete(storageId);
	}

	return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}
