import type { IngredientGroup, InstructionGroup } from './types';

// Mela's ingredients/instructions fields are newline-separated plain text with
// a small markdown-like subset: "# " starts a group/section title, and
// **bold**, *italic*, [text](url) are supported inline. See
// https://mela.recipes/fileformat/index.html

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// Eine Zahl: ganzzahlig, dezimal, als Bereich ("2,5 - 3") oder als Bruch.
const NUMBER = String.raw`\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?(?:\s+\d+\/\d+)?|\d+\/\d+`;

// Abkürzungen und ausgeschriebene Formen. Die Reihenfolge ist unkritisch: durch
// das \b am Ende von AMOUNT_RE greift das Backtracking, "g" scheitert bei
// "Gramm" also am Wortende und die längere Variante kommt zum Zug.
const UNIT = String.raw`(?:${[
	// Gewicht
	String.raw`mg|g|kg|Milligramm|Gramm|Kilogramm|Kilo|Pfund|oz|lbs?`,
	// Volumen
	String.raw`ml|cl|dl|l|Milliliter|Zentiliter|Deziliter|Liter`,
	// Löffel, Tassen, Messerspitzen
	String.raw`EL|TL|Esslöffel|Teelöffel|Tassen?|Becher|cups?|tsp|tbsp|Msp\.?|Messerspitzen?`,
	// Temperatur — in Rezepten sind Grad immer Temperatur, nie Winkel
	String.raw`Grad(?:\s+Celsius)?`,
	// Stückzahlen und Gebinde
	String.raw`Stk\.?|Stück|Prisen?|Bund|Dosen?|Päckchen|Pck\.?|Zehen?|Scheiben?|Blätter|Blatt|Handvoll|Tropfen|Kugeln?|cloves?|pinch(?:es)?`
].join('|')})`;

const DURATION_UNIT = String.raw`(?:Std\.?|Stunden?|Minuten?|Min\.?|Sekunden?|Sek\.?|hrs?|hours?|min|minutes?|sec|seconds?)`;

// Nur für Zutatenzeilen: Klammerinhalte ("(500 g)", "(optional)") in der
// gedämpften Sekundärfarbe statt normalem Text — macht sie sichtbar als
// Zusatzinfo statt als Teil des eigentlichen Zutatennamens.
const PAREN_RE = /\([^()]*\)/g;

// Kennzahlen, die auch mitten im Text hervorgehoben werden sollen — etwa eine
// Ofentemperatur oder eine Menge in einem Zubereitungsschritt. Mengen brauchen
// hier zwingend eine Einheit, sonst würde jede beliebige Zahl eingefärbt.
const TEMPERATURE_RE = /\b\d+(?:\s*[-–]\s*\d+)?\s?°?\s?[CF]\b/g;
const DURATION_RE = new RegExp(String.raw`\b(?:${NUMBER})\s?${DURATION_UNIT}\b`, 'gi');
const AMOUNT_RE = new RegExp(String.raw`\b(?:${NUMBER})\s*${UNIT}\b`, 'gi');

function highlightMeasurements(escapedHtml: string): string {
	let html = escapedHtml.replace(
		TEMPERATURE_RE,
		(match) => `<span class="quantity">${match}</span>`
	);
	html = html.replace(DURATION_RE, (match) => `<span class="time-badge">${match}</span>`);
	html = html.replace(AMOUNT_RE, (match) => `<span class="quantity">${match}</span>`);
	return html;
}

/** Escapes text, then applies the small Mela markdown subset. Safe to use with {@html}.
 *  `factor` skaliert Mengen mit Einheit im Text (z. B. "200 g Mehl unterrühren" in einem
 *  Zubereitungsschritt) — Temperaturen und Zeitangaben sind eigene Regexe ohne
 *  Mengeneinheiten und bleiben deshalb unberührt. Nur für Zubereitungsschritte gedacht,
 *  nicht für Beschreibung/Notizen/Nährwerte, wo skalierte Zahlen falsch wären.
 *  `highlightParens` färbt Klammerinhalte gedämpft ein — nur für Zutatenzeilen gedacht,
 *  läuft deshalb erst NACH dem Link-Markdown, sonst würde "(url)" aus "[text](url)"
 *  fälschlich als Klammerinhalt erkannt und der Link nicht mehr geparst. */
export function renderInlineMarkdown(raw: string, factor = 1, highlightParens = false): string {
	const text = factor === 1 ? raw : scaleEmbeddedAmounts(raw, factor);
	let html = escapeHtml(text);
	html = highlightMeasurements(html);

	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text: string, url: string) => {
		const isSafeUrl = /^(https?:|mailto:)/i.test(url);
		return isSafeUrl
			? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
			: text;
	});
	html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

	if (highlightParens) {
		html = html.replace(PAREN_RE, (match) => `<span class="parenthetical">${match}</span>`);
	}

	return html;
}

// Menge am Zeilenanfang einer Zutat, z. B. "200 g", "1 1/2 TL", "2-3 Zehen".
// Anders als mitten im Text ist die Einheit hier optional: "2 Tomaten" ist an
// dieser Stelle eindeutig eine Mengenangabe.
const QUANTITY_RE = new RegExp(String.raw`^(?:${NUMBER})(?:\s*${UNIT})?\b`, 'i');

// --- Portionsskalierung ------------------------------------------------------
// Skaliert nur erkannte Zutatenmengen (Zeilenanfang + Mengen mit Einheit im
// Rest der Zeile, z. B. "(500 g)"). Zeitangaben/Temperaturen kommen hier nicht
// vor — die werden separat über highlightMeasurements() erkannt und bleiben
// unangetastet, weil Kochzeit und Ofentemperatur sich nicht mit der
// Portionsgröße ändern.

const FRACTION_GLYPHS: Array<[number, string]> = [
	[1 / 4, '¼'],
	[1 / 3, '⅓'],
	[1 / 2, '½'],
	[2 / 3, '⅔'],
	[3 / 4, '¾']
];
const FRACTION_EPSILON = 0.05;

/** "1.000" ist im deutschen Zahlenformat eintausend, nicht 1,0 — nur als
 *  Tausendertrennzeichen erkannt, wenn ausschließlich vollständige
 *  Dreiergruppen nach dem Punkt folgen ("1.5" bleibt unangetastet). */
function stripGermanThousandsSeparator(text: string): string {
	return /^\d{1,3}(\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text;
}

function parseAmountNumber(text: string): number {
	const trimmed = text.trim();
	const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
	if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
	const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
	if (fraction) return Number(fraction[1]) / Number(fraction[2]);
	return parseFloat(stripGermanThousandsSeparator(trimmed).replace(',', '.'));
}

/** Rundet auf eine hübsche Bruch-Schreibweise, wenn möglich, sonst zwei Nachkommastellen. */
function formatAmountNumber(value: number): string {
	if (!Number.isFinite(value) || value < 0) return '';
	const whole = Math.floor(value + 1e-9);
	const frac = value - whole;

	for (const [fractionValue, glyph] of FRACTION_GLYPHS) {
		if (Math.abs(frac - fractionValue) < FRACTION_EPSILON) {
			return whole > 0 ? `${whole}${glyph}` : glyph;
		}
	}
	if (frac < FRACTION_EPSILON) return String(whole);

	return value.toFixed(2).replace(/0+$/, '').replace(/[.,]$/, '').replace('.', ',');
}

/** Skaliert eine einzelne Zahl oder einen Bereich ("2-3") als Text. */
function scaleNumberText(text: string, factor: number): string {
	const trimmed = text.trim();
	const range = trimmed.match(/^(.+?)\s*[-–]\s*(.+)$/);
	if (range) {
		const from = parseAmountNumber(range[1]);
		const to = parseAmountNumber(range[2]);
		if (!Number.isNaN(from) && !Number.isNaN(to)) {
			return `${formatAmountNumber(from * factor)}-${formatAmountNumber(to * factor)}`;
		}
	}
	const value = parseAmountNumber(trimmed);
	return Number.isNaN(value) ? text : formatAmountNumber(value * factor);
}

/** Skaliert die Zahl am Anfang eines Mengen-Treffers ("500 g" → "1000 g"), Einheit bleibt. */
function scaleMeasurementMatch(match: string, factor: number): string {
	const numberMatch = match.match(new RegExp(`^(?:${NUMBER})`));
	if (!numberMatch) return match;
	const numberText = numberMatch[0];
	const rest = match.slice(numberText.length);
	return `${scaleNumberText(numberText, factor)}${rest}`;
}

/** Skaliert Mengen mit Einheit irgendwo im Text (z. B. das "(500 g)" hinter dem Zutatennamen). */
function scaleEmbeddedAmounts(text: string, factor: number): string {
	return text.replace(AMOUNT_RE, (match) => scaleMeasurementMatch(match, factor));
}

/** Renders one ingredient line, wrapping a leading quantity in a highlight span.
 *  `factor` skaliert erkannte Mengen (Portionsskalierung) — Extraktion der
 *  Mengenangabe passiert genau einmal auf dem rohen (rein numerischen) Text,
 *  danach wird nur noch das schon skalierte Ergebnis eingesetzt. Ein zweiter
 *  Durchlauf über bereits skalierten Text (mit z. B. "½") würde an den
 *  Bruch-Glyphen scheitern, weil die nicht Teil von NUMBER sind. */
export function renderIngredientLine(rawLine: string, factor = 1): string {
	const trimmed = rawLine.trim();
	const match = trimmed.match(QUANTITY_RE);

	if (!match || match[0].trim().length === 0) {
		const rest = factor === 1 ? trimmed : scaleEmbeddedAmounts(trimmed, factor);
		return renderInlineMarkdown(rest, 1, true);
	}

	const quantity = match[0].trim();
	const rest = trimmed.slice(match[0].length).trim();
	const scaledQuantity = factor === 1 ? quantity : scaleMeasurementMatch(quantity, factor);
	const quantityHtml = `<span class="quantity">${escapeHtml(scaledQuantity)}</span>`;

	if (!rest) return quantityHtml;
	const scaledRest = factor === 1 ? rest : scaleEmbeddedAmounts(rest, factor);
	return `${quantityHtml} ${renderInlineMarkdown(scaledRest, 1, true)}`;
}

/** Splits raw lines into groups at each "# Title" line. */
function splitIntoGroups(raw: string | undefined): Array<{ title?: string; lines: string[] }> {
	if (!raw) return [];

	const groups: Array<{ title?: string; lines: string[] }> = [];
	let current: { title?: string; lines: string[] } = { lines: [] };
	let started = false;

	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		if (trimmed.startsWith('#')) {
			if (started) groups.push(current);
			current = { title: trimmed.replace(/^#+\s*/, ''), lines: [] };
			started = true;
		} else {
			current.lines.push(trimmed);
			started = true;
		}
	}
	if (started) groups.push(current);

	return groups;
}

export function parseIngredientGroups(raw?: string): IngredientGroup[] {
	return splitIntoGroups(raw).map(({ title, lines }) => ({ title, items: lines }));
}

export function parseInstructionGroups(raw?: string): InstructionGroup[] {
	return splitIntoGroups(raw).map(({ title, lines }) => ({ title, steps: lines }));
}

export interface CookStep {
	text: string;
	/** Nur beim ersten Schritt einer Gruppe gesetzt, z. B. "Teig". */
	sectionTitle?: string;
}

/** Für den Kochmodus: eine flache, durchnummerierbare Liste aller Schritte. */
export function flattenInstructionSteps(groups: InstructionGroup[]): CookStep[] {
	return groups.flatMap((group) =>
		group.steps.map((text, i) => ({ text, sectionTitle: i === 0 ? group.title : undefined }))
	);
}

/** Erste im Text erkannte Dauer in Sekunden — zur Vorbelegung des Kochmodus-Timers. */
export function extractDurationSeconds(text: string): number | null {
	const match = text.match(DURATION_RE);
	if (!match) return null;

	const amountMatch = match[0].match(new RegExp(`^(?:${NUMBER})`));
	if (!amountMatch) return null;

	// Bei einem Bereich ("10-12 Minuten") nur den ersten Wert verwenden.
	const amount = parseFloat(amountMatch[0].split(/[-–]/)[0].replace(',', '.'));
	if (Number.isNaN(amount)) return null;

	const isHours = /Std|Stunden?|hrs?|hours?/i.test(match[0]);
	return Math.round(amount * (isHours ? 3600 : 60));
}
