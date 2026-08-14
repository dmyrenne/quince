<script lang="ts">
	import { t, type Locale } from '$lib/i18n';

	const STEP = 0.5;
	const MIN = 0.5;
	const MAX = 6;

	let { factor = $bindable(1), locale }: { factor: number; locale: Locale } = $props();

	function step(delta: number) {
		factor = Math.round(Math.min(MAX, Math.max(MIN, factor + delta)) * 100) / 100;
	}

	let display = $derived.by(() => {
		if (Number.isInteger(factor)) return String(factor);
		return locale === 'de' ? factor.toFixed(1).replace('.', ',') : factor.toFixed(1);
	});
</script>

<div class="portion-scaler">
	<button
		type="button"
		onclick={() => step(-STEP)}
		disabled={factor <= MIN}
		aria-label={t(locale, 'scaleLess')}
	>
		−
	</button>
	<button
		type="button"
		class="factor"
		class:factor-default={factor === 1}
		onclick={() => (factor = 1)}
		aria-label={t(locale, 'scaleReset')}
	>
		{display}×
	</button>
	<button
		type="button"
		onclick={() => step(STEP)}
		disabled={factor >= MAX}
		aria-label={t(locale, 'scaleMore')}
	>
		+
	</button>
</div>

<style>
	.portion-scaler {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.portion-scaler button:not(.factor) {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		width: 1.8rem;
		height: 1.8rem;
		font-size: 1rem;
		line-height: 1;
		color: var(--color-text);
		cursor: pointer;
	}

	.portion-scaler button:not(.factor):disabled {
		opacity: 0.4;
		cursor: default;
	}

	.factor {
		background: none;
		border: none;
		font: inherit;
		font-family: var(--font-heading);
		font-weight: var(--font-weight-heading);
		font-variant-numeric: tabular-nums;
		min-width: 2.5rem;
		text-align: center;
		color: var(--color-text);
		cursor: pointer;
	}

	.factor:hover {
		color: var(--color-highlight);
	}

	/* Die Stellknöpfe sind auf Papier sinnlos — der Faktor selbst bleibt als
	   reiner Hinweistext stehen, falls jemand mit z. B. 2× gedruckt hat, und
	   verschwindet nur, wenn er beim unveränderten 1× ohnehin nichts aussagt. */
	@media print {
		.portion-scaler button:not(.factor) {
			display: none;
		}

		.factor-default {
			display: none;
		}
	}
</style>
