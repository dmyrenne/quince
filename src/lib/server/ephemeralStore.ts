import { randomUUID } from 'node:crypto';
import type { MelaRecipe } from '$lib/types';

// Für READ_ONLY-Instanzen (z. B. eine öffentlich erreichbare Demo ohne
// Volume/Bind-Mount): hochgeladene Rezepte landen nur hier im Prozessspeicher,
// nie auf der Platte, und verschwinden nach einer Weile von selbst wieder.
// Ein einzelner Prozess reicht für dieses Szenario völlig aus — es gibt
// bewusst keine Persistenz, die über einen Neustart hinweg synchronisiert
// werden müsste.

const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 100;
/** Die Anzahl allein begrenzt den Speicher nicht: ein Rezept mit Fotos kann
 *  zweistellige Megabyte groß sein, 100 davon wären schon ein Gigabyte. Deshalb
 *  zusätzlich ein Budget über die tatsächliche Größe. */
const MAX_TOTAL_BYTES = 256 * 1024 * 1024;

interface CacheEntry {
	recipe: MelaRecipe;
	bytes: number;
	expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
let totalBytes = 0;

function drop(id: string): void {
	const entry = cache.get(id);
	if (!entry) return;
	totalBytes -= entry.bytes;
	cache.delete(id);
}

function purgeExpired(): void {
	const now = Date.now();
	for (const [id, entry] of cache) {
		if (entry.expiresAt <= now) drop(id);
	}
}

/** Grobes Maß für den Speicherbedarf: die Fotos stecken als Base64 in `images`
 *  und machen praktisch die gesamte Größe aus. Genauer muss es nicht sein — es
 *  geht nur darum, dass der Cache nicht unbemerkt den Prozess auffrisst. */
function estimateBytes(recipe: MelaRecipe): number {
	return JSON.stringify(recipe).length;
}

/** Legt ein Rezept temporär ab und gibt seine (zufällige) ID zurück.
 *  Verdrängt dabei nach FIFO, bis Anzahl und Gesamtgröße wieder im Rahmen sind —
 *  eine öffentliche, unauthentifizierte Instanz darf nicht unbegrenzt wachsen,
 *  egal wie viele Leute gerade hochladen. */
export function cacheRecipe(recipe: MelaRecipe): string {
	purgeExpired();

	const bytes = estimateBytes(recipe);
	while (cache.size > 0 && (cache.size >= MAX_ENTRIES || totalBytes + bytes > MAX_TOTAL_BYTES)) {
		const oldestKey = cache.keys().next().value;
		if (oldestKey === undefined) break;
		drop(oldestKey);
	}

	const id = randomUUID();
	cache.set(id, { recipe, bytes, expiresAt: Date.now() + TTL_MS });
	totalBytes += bytes;
	return id;
}

export function getCachedRecipe(storageId: string): MelaRecipe | null {
	purgeExpired();
	return cache.get(storageId)?.recipe ?? null;
}
