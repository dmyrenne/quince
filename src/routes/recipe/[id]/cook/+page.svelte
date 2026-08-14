<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import {
		extractDurationSeconds,
		flattenInstructionSteps,
		parseIngredientGroups,
		parseInstructionGroups,
		renderIngredientLine,
		renderInlineMarkdown
	} from '$lib/parse';
	import PortionScaler from '$lib/components/PortionScaler.svelte';
	import { t } from '$lib/i18n';
	import type { PageProps } from './$types';

	const PULSE_PREF_KEY = 'quince-cook-pulse-enabled';
	const HOLD_ACCELERATE_MS = 2000;
	const HOLD_STEP_MS = 350;

	let { data }: PageProps = $props();
	let recipe = $derived(data.recipe);

	let ingredientGroups = $derived(parseIngredientGroups(recipe.ingredients));
	let steps = $derived(flattenInstructionSteps(parseInstructionGroups(recipe.instructions)));
	let checkedIngredients = new SvelteSet<string>();

	// Rein clientseitige Ansichtshilfe, nicht persistiert — siehe Rezeptdetailseite.
	let scaleFactor = $state(1);

	let stepIndex = $state(0);
	// Wenn ein neu geöffnetes Rezept weniger Schritte hat als der zuletzt
	// angezeigte Index, nicht auf einen nicht-existenten Schritt zeigen.
	$effect(() => {
		if (stepIndex > steps.length - 1) stepIndex = Math.max(0, steps.length - 1);
	});
	let currentStep = $derived(steps[stepIndex]);

	function toggleIngredient(key: string) {
		if (checkedIngredients.has(key)) checkedIngredients.delete(key);
		else checkedIngredients.add(key);
	}

	// --- Timer -----------------------------------------------------------------
	// Mehrere Timer nebeneinander: entweder von Hand über "Timer hinzufügen"
	// angelegt, oder indem man auf eine erkannte Zeitangabe im Schritttext tippt
	// — jeder Tap legt einen neuen Timer in der Timer-Spalte ab, statt einen
	// bestehenden zu überschreiben.
	interface TimerEntry {
		id: string;
		/** Die zuletzt eingestellte Dauer — worauf "Zurücksetzen" zurückspringt. */
		totalSeconds: number;
		remaining: number;
		running: boolean;
		alarm: boolean;
		editingField: 'hours' | 'minutes' | null;
	}

	interface TimerHandles {
		tick?: ReturnType<typeof setInterval>;
		beep?: ReturnType<typeof setInterval>;
		holdTimeout?: ReturnType<typeof setTimeout>;
		holdInterval?: ReturnType<typeof setInterval>;
	}

	let timers = $state<TimerEntry[]>([]);
	// Interval-/Timeout-Handles gehören bewusst nicht ins reaktive State — sie
	// sind reine Laufzeit-Buchhaltung ohne Anzeige-Relevanz, SvelteMap wäre
	// hier nur unnötiger Reaktivitäts-Overhead.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const timerHandles = new Map<string, TimerHandles>();
	let anyAlarmActive = $derived(timers.some((timer) => timer.alarm));

	function hoursOf(totalSeconds: number) {
		return Math.floor(totalSeconds / 3600);
	}
	function minutesOf(totalSeconds: number) {
		return Math.floor((totalSeconds % 3600) / 60);
	}
	function secondsOf(totalSeconds: number) {
		return totalSeconds % 60;
	}

	function findTimer(id: string) {
		return timers.find((timer) => timer.id === id);
	}

	function createTimer(initialSeconds: number) {
		const id = crypto.randomUUID();
		timers.push({
			id,
			totalSeconds: initialSeconds,
			remaining: initialSeconds,
			running: false,
			alarm: false,
			editingField: null
		});
		timerHandles.set(id, {});
	}

	function removeTimer(id: string) {
		const handles = timerHandles.get(id);
		clearInterval(handles?.tick);
		clearInterval(handles?.beep);
		clearTimeout(handles?.holdTimeout);
		clearInterval(handles?.holdInterval);
		timerHandles.delete(id);
		timers = timers.filter((t) => t.id !== id);
	}

	/** Antippen einer erkannten Zeitangabe im Schritttext legt einen neuen,
	 *  vorausgefüllten Timer an — gestartet werden muss er weiterhin manuell. */
	function handleStepTextClick(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof HTMLElement) || !target.classList.contains('time-badge')) return;

		const secondsFound = extractDurationSeconds(target.textContent ?? '');
		if (secondsFound !== null) createTimer(secondsFound);
	}

	function stepMinutes(id: string, deltaMinutes: number) {
		const timer = findTimer(id);
		if (!timer) return;
		timer.totalSeconds = Math.max(0, timer.totalSeconds + deltaMinutes * 60);
		timer.remaining = timer.totalSeconds;
	}

	function beginHold(id: string, deltaMinutes: number) {
		const timer = findTimer(id);
		if (!timer || timer.running) return;
		stepMinutes(id, deltaMinutes);
		const handles = timerHandles.get(id);
		if (!handles) return;
		clearTimeout(handles.holdTimeout);
		clearInterval(handles.holdInterval);
		handles.holdTimeout = setTimeout(() => {
			handles.holdInterval = setInterval(() => stepMinutes(id, deltaMinutes * 5), HOLD_STEP_MS);
		}, HOLD_ACCELERATE_MS);
	}

	function endHold(id: string) {
		const handles = timerHandles.get(id);
		clearTimeout(handles?.holdTimeout);
		clearInterval(handles?.holdInterval);
	}

	function commitHours(id: string, raw: string) {
		const timer = findTimer(id);
		if (!timer) return;
		const value = Math.max(0, Math.min(99, Math.round(Number(raw)) || 0));
		timer.totalSeconds = value * 3600 + minutesOf(timer.remaining) * 60;
		timer.remaining = timer.totalSeconds;
		timer.editingField = null;
	}

	function commitMinutes(id: string, raw: string) {
		const timer = findTimer(id);
		if (!timer) return;
		const value = Math.max(0, Math.min(59, Math.round(Number(raw)) || 0));
		timer.totalSeconds = hoursOf(timer.remaining) * 3600 + value * 60;
		timer.remaining = timer.totalSeconds;
		timer.editingField = null;
	}

	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function ensureAudioContext(): AudioContext {
		audioCtx ??= new AudioContext();
		return audioCtx;
	}
	let audioCtx: AudioContext | undefined;

	function beepOnce() {
		const ctx = ensureAudioContext();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.frequency.value = 880;
		osc.connect(gain);
		gain.connect(ctx.destination);
		gain.gain.setValueAtTime(0.0001, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
		osc.start();
		osc.stop(ctx.currentTime + 0.35);
	}

	function triggerAlarm(id: string) {
		const timer = findTimer(id);
		const handles = timerHandles.get(id);
		if (!timer || !handles) return;
		timer.alarm = true;
		beepOnce();
		clearInterval(handles.beep);
		handles.beep = setInterval(beepOnce, 1200);
	}

	function dismissAlarm(id: string) {
		const timer = findTimer(id);
		if (timer) timer.alarm = false;
		clearInterval(timerHandles.get(id)?.beep);
	}

	function dismissAllAlarms() {
		for (const timer of timers) if (timer.alarm) dismissAlarm(timer.id);
	}

	function startTimer(id: string) {
		const timer = findTimer(id);
		const handles = timerHandles.get(id);
		if (!timer || !handles || timer.remaining <= 0) return;
		// AudioContexts dürfen nur nach einer Nutzer-Geste starten — das hier
		// ist der früheste Klick, den wir dafür garantiert haben.
		ensureAudioContext();
		dismissAlarm(id);
		timer.editingField = null;
		timer.running = true;
		clearInterval(handles.tick);
		handles.tick = setInterval(() => {
			timer.remaining = Math.max(0, timer.remaining - 1);
			if (timer.remaining === 0) {
				clearInterval(handles.tick);
				timer.running = false;
				triggerAlarm(id);
			}
		}, 1000);
	}

	function pauseTimer(id: string) {
		const timer = findTimer(id);
		if (timer) timer.running = false;
		clearInterval(timerHandles.get(id)?.tick);
	}

	function resetTimer(id: string) {
		pauseTimer(id);
		dismissAlarm(id);
		const timer = findTimer(id);
		if (timer) timer.remaining = timer.totalSeconds;
	}

	onDestroy(() => {
		for (const handles of timerHandles.values()) {
			clearInterval(handles.tick);
			clearInterval(handles.beep);
			clearTimeout(handles.holdTimeout);
			clearInterval(handles.holdInterval);
		}
	});

	// --- Barrierefreiheit: Bildschirm-Wabern -----------------------------------
	let pulseEnabled = $state(true);
	$effect(() => {
		const stored = localStorage.getItem(PULSE_PREF_KEY);
		if (stored !== null) pulseEnabled = stored === 'true';
	});
	$effect(() => {
		localStorage.setItem(PULSE_PREF_KEY, String(pulseEnabled));
	});

	// --- Bildschirm an lassen, solange der Kochmodus offen ist -----------------
	$effect(() => {
		let wakeLock: WakeLockSentinel | undefined;
		let cancelled = false;

		async function requestWakeLock() {
			try {
				if ('wakeLock' in navigator) {
					const lock = await navigator.wakeLock.request('screen');
					if (cancelled) await lock.release();
					else wakeLock = lock;
				}
			} catch {
				// Wake Lock ist ein Komfort-Feature, kein Muss — stumm ignorieren.
			}
		}

		function handleVisibilityChange() {
			if (document.visibilityState === 'visible') requestWakeLock();
		}

		requestWakeLock();
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			cancelled = true;
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			wakeLock?.release().catch(() => {});
		};
	});
</script>

<svelte:head>
	<title>{t(data.locale, 'cookModeTitle', { title: recipe.title })}</title>
</svelte:head>

{#if anyAlarmActive}
	<button class="alarm-overlay" class:pulsing={pulseEnabled} onclick={dismissAllAlarms}>
		<span class="alarm-text">{t(data.locale, 'alarmText')}</span>
	</button>
{/if}

<div class="cook">
	<header class="cook-header">
		<a
			href={resolve('/recipe/[id]', { id: encodeURIComponent(recipe.storageId) })}
			class="back-link">{t(data.locale, 'backToRecipe')}</a
		>
		<h1>{recipe.title}</h1>
	</header>

	<div class="cook-grid">
		<section class="ingredients">
			<div class="ingredients-header">
				<h2>{t(data.locale, 'ingredients')}</h2>
				<PortionScaler bind:factor={scaleFactor} locale={data.locale} />
			</div>
			{#each ingredientGroups as group, gi (gi)}
				{#if group.title}<h3>{group.title}</h3>{/if}
				<ul>
					{#each group.items as item, ii (ii)}
						{@const key = `${gi}:${ii}`}
						<li>
							<label class:done={checkedIngredients.has(key)}>
								<input
									type="checkbox"
									checked={checkedIngredients.has(key)}
									onchange={() => toggleIngredient(key)}
								/>
								<span
									><!-- eslint-disable-next-line svelte/no-at-html-tags -- renderIngredientLine escapes HTML first, then only allows a small whitelisted markdown subset -->
									{@html renderIngredientLine(item, scaleFactor)}</span
								>
							</label>
						</li>
					{/each}
				</ul>
			{/each}
		</section>

		<section class="step-column">
			{#if currentStep}
				<div class="step-viewer">
					{#if currentStep.sectionTitle}
						<h2 class="section-title">{currentStep.sectionTitle}</h2>
					{/if}
					<!-- Klick-Ziel sind die .time-badge-Spans im gerenderten Text, nicht der
					     Absatz selbst — die Zeitangaben sind reiner Text ohne eigene
					     fokussierbare Elemente, eine Tastatur-Alternative ergibt hier keinen Sinn. -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<p class="step-text" onclick={handleStepTextClick}>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderInlineMarkdown escapes HTML first, then only allows a small whitelisted markdown subset -->
						{@html renderInlineMarkdown(currentStep.text, scaleFactor)}
					</p>
				</div>

				<div class="step-pager">
					<button
						type="button"
						onclick={() => (stepIndex = Math.max(0, stepIndex - 1))}
						disabled={stepIndex === 0}
						aria-label={t(data.locale, 'previousStep')}
					>
						‹
					</button>
					<span class="step-count">{stepIndex + 1} / {steps.length}</span>
					<button
						type="button"
						onclick={() => (stepIndex = Math.min(steps.length - 1, stepIndex + 1))}
						disabled={stepIndex === steps.length - 1}
						aria-label={t(data.locale, 'nextStep')}
					>
						›
					</button>
				</div>
			{:else}
				<p class="no-steps">{t(data.locale, 'noSteps')}</p>
			{/if}
		</section>

		<section class="timer-column">
			<button type="button" class="add-timer" onclick={() => createTimer(0)}>
				{t(data.locale, 'addTimer')}
			</button>

			{#each timers as timer, i (timer.id)}
				<div class="timer-card">
					<div class="timer-card-header">
						<span>{t(data.locale, 'timerLabel', { n: i + 1 })}</span>
						<button
							type="button"
							class="remove-timer"
							onclick={() => removeTimer(timer.id)}
							aria-label={t(data.locale, 'removeTimer', { n: i + 1 })}
						>
							×
						</button>
					</div>

					<div class="time-parts" class:alarm={timer.alarm}>
						<div class="time-part">
							{#if timer.editingField === 'hours'}
								<input
									use:autofocus
									class="time-input"
									type="number"
									inputmode="numeric"
									min="0"
									value={hoursOf(timer.remaining)}
									onblur={(e) => commitHours(timer.id, e.currentTarget.value)}
									onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
								/>
							{:else}
								<button
									type="button"
									class="time-number"
									disabled={timer.running}
									onclick={() => (timer.editingField = 'hours')}>{hoursOf(timer.remaining)}</button
								>
							{/if}
							<span class="time-label">{t(data.locale, 'hours')}</span>
						</div>
						<span class="time-sep">:</span>
						<div class="time-part">
							{#if timer.editingField === 'minutes'}
								<input
									use:autofocus
									class="time-input"
									type="number"
									inputmode="numeric"
									min="0"
									max="59"
									value={minutesOf(timer.remaining)}
									onblur={(e) => commitMinutes(timer.id, e.currentTarget.value)}
									onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
								/>
							{:else}
								<button
									type="button"
									class="time-number"
									disabled={timer.running}
									onclick={() => (timer.editingField = 'minutes')}
									>{String(minutesOf(timer.remaining)).padStart(2, '0')}</button
								>
							{/if}
							<span class="time-label">{t(data.locale, 'minutes')}</span>
						</div>
						<span class="time-sep">:</span>
						<div class="time-part">
							<span class="time-number static"
								>{String(secondsOf(timer.remaining)).padStart(2, '0')}</span
							>
							<span class="time-label">{t(data.locale, 'seconds')}</span>
						</div>
					</div>

					<div class="timer-row">
						<button
							type="button"
							class="stepper"
							disabled={timer.running}
							onpointerdown={() => beginHold(timer.id, -1)}
							onpointerup={() => endHold(timer.id)}
							onpointerleave={() => endHold(timer.id)}
							aria-label={t(data.locale, 'stepperLess')}
						>
							−
						</button>
						{#if timer.running}
							<button type="button" class="primary" onclick={() => pauseTimer(timer.id)}
								>{t(data.locale, 'pause')}</button
							>
						{:else}
							<button
								type="button"
								class="primary"
								onclick={() => startTimer(timer.id)}
								disabled={timer.remaining <= 0}>{t(data.locale, 'start')}</button
							>
						{/if}
						<button
							type="button"
							class="stepper"
							disabled={timer.running}
							onpointerdown={() => beginHold(timer.id, 1)}
							onpointerup={() => endHold(timer.id)}
							onpointerleave={() => endHold(timer.id)}
							aria-label={t(data.locale, 'stepperMore')}
						>
							+
						</button>
					</div>
					<button type="button" class="reset-link" onclick={() => resetTimer(timer.id)}>
						{t(data.locale, 'reset')}
					</button>
				</div>
			{:else}
				<p class="no-timers">
					{t(data.locale, 'noTimers')}
				</p>
			{/each}

			<label class="pulse-toggle">
				<input type="checkbox" bind:checked={pulseEnabled} />
				{t(data.locale, 'pulseToggle')}
			</label>
		</section>
	</div>
</div>

<style>
	.cook {
		max-width: var(--content-max-width);
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}

	.cook-header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.cook-header h1 {
		font-size: 2rem;
	}

	.cook-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	/* --- Zutaten ------------------------------------------------------------ */
	.ingredients {
		background: var(--color-ingredients-bg);
		border-radius: var(--radius);
		padding: 1.5rem 1.75rem;
	}

	.ingredients h2 {
		font-size: var(--font-size-section);
	}

	.ingredients h3 {
		font-size: 1.05rem;
		font-family: var(--font-body);
		font-weight: 600;
		margin-top: 1.1rem;
	}

	.ingredients-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	.ingredients ul {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0;
	}

	.ingredients li {
		margin-bottom: 0.5rem;
	}

	.ingredients label {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		cursor: pointer;
	}

	.ingredients label.done {
		color: var(--color-text-muted);
		text-decoration: line-through;
	}

	/* --- Schritt-Spalte ------------------------------------------------------ */
	.step-column {
		display: flex;
		flex-direction: column;
	}

	.step-viewer {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 2rem 1.75rem;
		min-height: 10rem;
	}

	.step-pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.step-pager button {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		width: 2.25rem;
		height: 2.25rem;
		font-size: 1.2rem;
		color: var(--color-text);
		cursor: pointer;
	}

	.step-pager button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.step-count {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		min-width: 3.5rem;
		text-align: center;
	}

	.section-title {
		font-size: 1.4rem;
		margin-bottom: 0.75rem;
	}

	.step-text {
		font-size: 1.4rem;
		line-height: 1.5;
	}

	.step-text :global(.time-badge) {
		cursor: pointer;
		text-decoration: underline dotted;
		text-underline-offset: 3px;
	}

	.no-steps,
	.no-timers {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	/* --- Timer-Spalte --------------------------------------------------------- */
	.timer-column {
		display: flex;
		flex-direction: column;
		align-self: start;
		gap: 1rem;
	}

	.add-timer {
		background: var(--color-highlight);
		border: none;
		border-radius: var(--radius);
		color: #fff;
		font-weight: 600;
		font: inherit;
		padding: 0.65rem 1rem;
		cursor: pointer;
	}

	.timer-card {
		background: var(--color-ingredients-bg);
		border-radius: var(--radius);
		padding: 1.1rem 1.25rem;
		text-align: center;
	}

	.timer-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
	}

	.remove-timer {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
		padding: 0.1rem 0.3rem;
	}

	.remove-timer:hover {
		color: var(--color-highlight);
	}

	.time-parts {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}

	.time-parts.alarm .time-number {
		color: var(--color-highlight);
	}

	.time-part {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 3.2rem;
	}

	.time-sep {
		font-family: var(--font-heading);
		font-size: 1.7rem;
		line-height: 1;
		margin-top: 0.05rem;
	}

	.time-number,
	.time-input {
		font-family: var(--font-heading);
		font-weight: var(--font-weight-heading);
		font-size: 1.7rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		width: 100%;
		text-align: center;
		background: none;
		border: none;
		color: var(--color-text);
		padding: 0;
	}

	.time-number:not(:disabled) {
		cursor: pointer;
	}

	.time-number:not(.static):not(:disabled):hover {
		color: var(--color-highlight);
	}

	.time-number:disabled {
		cursor: default;
	}

	.time-input {
		border-bottom: 2px solid var(--color-highlight);
	}

	.time-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		margin-top: 0.1rem;
	}

	.timer-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		margin-bottom: 0.4rem;
	}

	.timer-row button,
	.reset-link {
		font: inherit;
		cursor: pointer;
	}

	.stepper {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		width: 2.4rem;
		height: 2.4rem;
		font-size: 1.2rem;
		color: var(--color-text);
		line-height: 1;
		touch-action: none;
		user-select: none;
	}

	.stepper:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.timer-row button.primary {
		background: var(--color-highlight);
		border: 1px solid var(--color-highlight);
		border-radius: var(--radius);
		color: #fff;
		font-weight: 600;
		padding: 0.5rem 1.1rem;
	}

	.timer-row button.primary:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.reset-link {
		display: block;
		margin: 0 auto;
		background: none;
		border: none;
		color: var(--color-text-muted);
		text-decoration: underline;
		font-size: 0.8rem;
	}

	.pulse-toggle {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-top: 0.5rem;
	}

	/* Ganz am Ende platziert, damit diese Regeln unabhängig von der
	   Deklarationsreihenfolge der weiter oben stehenden Basis-Regeln gewinnen
	   (gleiche Spezifität, aber späteres Vorkommen im Stylesheet). */
	@media (min-width: 1000px) {
		.cook-grid {
			grid-template-columns: 0.85fr 1.5fr 1fr;
			grid-template-rows: auto auto;
			gap: 1.5rem 2rem;
		}

		/* Zutaten- und Schritt-Kasten liegen explizit in derselben Zeile, damit
		   sie per Grid-Stretch gleich hoch werden. Der Pager bekommt eine eigene
		   zweite Zeile, die die Höhe der ersten Zeile nicht mit beeinflusst — die
		   Buttons hängen also unterhalb des Kastens, statt dessen Höhe zu drücken. */
		.ingredients {
			grid-column: 1;
			grid-row: 1;
		}

		.step-column {
			display: contents;
		}

		.step-viewer {
			grid-column: 2;
			grid-row: 1;
		}

		.step-pager {
			grid-column: 2;
			grid-row: 2;
			margin-top: 0;
		}

		.no-steps {
			grid-column: 2;
			grid-row: 1;
		}

		.timer-column {
			grid-column: 3;
			grid-row: 1;
		}
	}

	/* --- Alarm ----------------------------------------------------------------- */
	.alarm-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		width: 100%;
		border: none;
		background: color-mix(in oklab, var(--color-highlight) 55%, transparent);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 2rem;
		text-align: center;
	}

	.alarm-overlay.pulsing {
		animation: wabern 3s ease-in-out infinite;
	}

	.alarm-text {
		font-size: 1.5rem;
		font-weight: 600;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
	}

	@keyframes wabern {
		0%,
		100% {
			background: radial-gradient(
				circle at 50% 50%,
				color-mix(in oklab, var(--color-highlight) 65%, transparent) 0%,
				color-mix(in oklab, var(--color-highlight) 15%, transparent) 75%
			);
		}
		50% {
			background: radial-gradient(
				circle at 50% 50%,
				color-mix(in oklab, var(--color-highlight) 95%, transparent) 0%,
				color-mix(in oklab, var(--color-highlight) 45%, transparent) 75%
			);
		}
	}
</style>
