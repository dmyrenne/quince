<script lang="ts">
	import '@fontsource-variable/geist';
	import '@fontsource-variable/playfair-display';
	import '../app.css';
	import { resolve } from '$app/paths';
	import { t } from '$lib/i18n';
	import favicon from '$lib/assets/quince-placeholder.png';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// Real gemessen statt geschätzt — die Seitenleiste auf Rezeptseiten muss
	// wissen, wie viel Platz Header und Footer ihr wegnehmen, um sich exakt
	// auf die verbleibende Viewport-Höhe zu begrenzen (siehe recipe/+layout.svelte).
	let headerHeight = $state(0);
	let footerHeight = $state(0);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="page" style="--header-height: {headerHeight}px; --footer-height: {footerHeight}px;">
	<header class="site-header" bind:clientHeight={headerHeight}>
		<div class="content-width header-inner">
			<a href={resolve('/')} class="wordmark">Quince</a>
			<nav>
				<a href={resolve('/about')}>{t(data.locale, 'navAbout')}</a>
				<a href={resolve('/upload')} class="upload-button">{t(data.locale, 'navUpload')}</a>
			</nav>
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="site-footer" bind:clientHeight={footerHeight}>
		<div class="content-width footer-inner">
			<p>
				Created by
				<a href="https://dmy.work" target="_blank" rel="noopener noreferrer">Daniel Myrenne</a>
				with Claude as an ode to
				<a href="https://mela.recipes/" target="_blank" rel="noopener noreferrer">Mela</a>
			</p>
		</div>
	</footer>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.site-header {
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-block: 0.9rem;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
	}

	.wordmark {
		font-family: var(--font-heading);
		font-weight: var(--font-weight-heading);
		font-size: var(--font-size-wordmark);
		color: var(--color-text);
		text-decoration: none;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	nav a {
		font-size: 0.95rem;
		text-decoration: none;
		color: var(--color-text-muted);
	}

	nav a:hover {
		color: var(--color-link);
	}

	.upload-button {
		background: var(--color-quantity);
		color: #fff;
		padding: 0.5rem 1rem;
		border-radius: var(--radius);
		font-weight: 600;
	}

	.upload-button:hover {
		color: #fff;
		opacity: 0.9;
	}

	main {
		flex: 1;
		padding-block: 2rem;
		width: 100%;
	}

	.site-footer {
		border-top: 1px solid var(--color-border);
	}

	.footer-inner {
		padding-block: 1rem;
	}

	.footer-inner p {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		text-align: center;
	}

	.footer-inner a {
		color: var(--color-text-muted);
		text-decoration: underline;
	}

	.footer-inner a:hover {
		color: var(--color-link);
	}
</style>
