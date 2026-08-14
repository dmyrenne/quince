<script lang="ts">
	import { resolve } from '$app/paths';
	import { t } from '$lib/i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Quince – Rezepte</title>
</svelte:head>

<div class="container">
	<div class="empty card">
		<h1>{t(data.locale, data.readOnly ? 'homeEmptyTitleReadOnly' : 'homeEmptyTitle')}</h1>
		<p>{t(data.locale, data.readOnly ? 'homeEmptyBodyReadOnly' : 'homeEmptyBody')}</p>
		<a class="button" href={resolve('/upload')}>{t(data.locale, 'navUpload')}</a>
	</div>
</div>

<style>
	.empty {
		text-align: center;
		padding: 3rem 1.5rem;
	}

	.empty p {
		color: var(--color-text-muted);
		margin-bottom: 1.25rem;
	}

	.button {
		display: inline-block;
		padding: 0.6rem 1.2rem;
		border-radius: var(--radius);
		background: var(--color-highlight);
		color: #fff;
		text-decoration: none;
	}
</style>
