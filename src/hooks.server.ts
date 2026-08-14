import type { Handle } from '@sveltejs/kit';
import { isReadOnly } from '$lib/server/store';
import type { Locale } from '$lib/i18n';

/** Sprache kommt vom Browser/Betriebssystem, nicht von einer Nutzereinstellung —
 *  Quince hat keinen Account, an dem man sowas festmachen könnte. Alles außer
 *  "de*" landet bei Englisch, da wir nur diese zwei Sprachen pflegen. */
function detectLocale(acceptLanguage: string | null): Locale {
	return acceptLanguage?.toLowerCase().includes('de') ? 'de' : 'en';
}

/** Quince ist dafür gedacht, öffentlich erreichbar zu sein (READ_ONLY-Instanz),
 *  und zeigt dabei Inhalte an, die irgendwer hochgeladen hat. Diese Header sind
 *  die billige Grundabsicherung, die nicht vom Reverse Proxy abhängen sollte:
 *  kein MIME-Sniffing, kein Einbetten in fremde Seiten, keine Referrer-Lecks an
 *  Rezeptquellen. Eine strengere CSP wäre schön, scheitert aber an SvelteKits
 *  Inline-Hydrationsskript — das bräuchte Nonces und damit Konfiguration in
 *  svelte.config.js, siehe ROADMAP. */
const SECURITY_HEADERS: Record<string, string> = {
	'x-content-type-options': 'nosniff',
	'x-frame-options': 'SAMEORIGIN',
	'referrer-policy': 'strict-origin-when-cross-origin'
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.locale = detectLocale(event.request.headers.get('accept-language'));
	event.locals.readOnly = isReadOnly;

	const response = await resolve(event);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(name, value);
	}
	return response;
};
