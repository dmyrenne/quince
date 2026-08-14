<script lang="ts">
	import {
		parseIngredientGroups,
		parseInstructionGroups,
		renderIngredientLine,
		renderInlineMarkdown
	} from '$lib/parse';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { recipeImageUrl } from '$lib/urls';
	import { t } from '$lib/i18n';
	import PortionScaler from '$lib/components/PortionScaler.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let recipe = $derived(data.recipe);

	let ingredientGroups = $derived(parseIngredientGroups(recipe.ingredients));
	let instructionGroups = $derived(parseInstructionGroups(recipe.instructions));

	// Rein clientseitige Ansichtshilfe, nicht persistiert — wie in Mela ändert
	// Skalieren nur die angezeigten Mengen, nicht die gespeicherte Datei.
	let scaleFactor = $state(1);

	let newCategory = $state('');
	function resetCategoryInput() {
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			newCategory = '';
		};
	}

	// Ein defektes Foto wird hier ausgeblendet statt durch die
	// Quitten-Illustration ersetzt — die ist nur für die Seitenleiste gedacht,
	// nicht fürs große Header-Bild.
	function hideOnError(event: Event) {
		(event.currentTarget as HTMLImageElement).style.display = 'none';
	}

	let hero = $derived(recipe.imageCount > 0 ? recipeImageUrl(recipe.storageId, 0) : null);
	let gallery = $derived(
		Array.from({ length: Math.max(0, recipe.imageCount - 1) }, (_, i) =>
			recipeImageUrl(recipe.storageId, i + 1)
		)
	);
</script>

<svelte:head>
	<title>{recipe.title} – Quince</title>
</svelte:head>

<article>
	<div class="header-block">
		{#if hero}
			<img class="hero" src={hero} alt={recipe.title} onerror={hideOnError} />
		{/if}

		<h1>{recipe.title}</h1>

		{#if recipe.text}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderInlineMarkdown escapes HTML first, then only allows a small whitelisted markdown subset -->
			<p class="description">{@html renderInlineMarkdown(recipe.text)}</p>
		{/if}

		<div class="meta-row">
			{#if recipe.yield}<span class="meta-item"
					>{t(data.locale, 'metaServings')}: {recipe.yield}</span
				>{/if}
			{#if recipe.prepTime}<span class="meta-item"
					>{t(data.locale, 'metaPrep')}: {recipe.prepTime}</span
				>{/if}
			{#if recipe.cookTime}<span class="meta-item"
					>{t(data.locale, 'metaCook')}: {recipe.cookTime}</span
				>{/if}
			{#if recipe.totalTime}<span class="meta-item"
					>{t(data.locale, 'metaTotal')}: {recipe.totalTime}</span
				>{/if}
		</div>
	</div>

	{#if !data.readOnly}
		<div class="flags">
			<form method="POST" action="?/toggleFavorite" use:enhance>
				<button type="submit" class="flag" aria-pressed={recipe.favorite}>
					<span class="icon" class:filled={recipe.favorite} aria-hidden="true"
						>{recipe.favorite ? '★' : '☆'}</span
					>
					{t(data.locale, 'favorite')}
				</button>
			</form>
			<form method="POST" action="?/toggleWantToCook" use:enhance>
				<button type="submit" class="flag" aria-pressed={recipe.wantToCook}>
					<span class="icon" class:filled={recipe.wantToCook} aria-hidden="true"
						>{recipe.wantToCook ? '⚑' : '⚐'}</span
					>
					{t(data.locale, 'wantToCook')}
				</button>
			</form>
		</div>
	{/if}

	{#if recipe.categories?.length || !data.readOnly}
		<div class="categories">
			{#each recipe.categories ?? [] as category (category)}
				{#if data.readOnly}
					<span class="category static">{category}</span>
				{:else}
					<form method="POST" action="?/removeCategory" use:enhance>
						<input type="hidden" name="category" value={category} />
						<button type="submit" class="category" title={t(data.locale, 'categoryRemoveTitle')}>
							{category} <span aria-hidden="true">×</span>
						</button>
					</form>
				{/if}
			{/each}
			{#if !data.readOnly}
				<form method="POST" action="?/addCategory" use:enhance={resetCategoryInput}>
					<input
						class="category-input"
						name="category"
						maxlength="60"
						placeholder={t(data.locale, 'categoryAddPlaceholder')}
						bind:value={newCategory}
					/>
				</form>
			{/if}
		</div>
	{/if}

	<div class="action-row">
		{#if recipe.instructions}
			<a
				class="cook-mode-button"
				href={resolve('/recipe/[id]/cook', { id: encodeURIComponent(recipe.storageId) })}
			>
				{t(data.locale, 'startCookMode')}
			</a>
		{/if}
		<div class="secondary-actions">
			<a
				class="export-link"
				href={resolve('/recipe/[id]/export', { id: encodeURIComponent(recipe.storageId) })}
				download
			>
				{t(data.locale, 'exportRecipe')}
			</a>
			<button type="button" class="print-link" onclick={() => window.print()}>
				{t(data.locale, 'print')}
			</button>
		</div>
	</div>

	<hr />

	<div class="body-grid">
		{#if ingredientGroups.length}
			<section class="ingredients">
				<div class="ingredients-header">
					<h2>{t(data.locale, 'ingredients')}</h2>
					<PortionScaler bind:factor={scaleFactor} locale={data.locale} />
				</div>
				{#each ingredientGroups as group, i (i)}
					{#if group.title}<h3>{group.title}</h3>{/if}
					<ul>
						{#each group.items as item, j (j)}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderIngredientLine escapes HTML first, then only allows a small whitelisted markdown subset -->
							<li>{@html renderIngredientLine(item, scaleFactor)}</li>
						{/each}
					</ul>
				{/each}
			</section>
		{/if}

		{#if instructionGroups.length}
			<section class="instructions">
				<h2>{t(data.locale, 'instructions')}</h2>
				{#each instructionGroups as group, i (i)}
					{#if group.title}<h3>{group.title}</h3>{/if}
					<ol>
						{#each group.steps as step, j (j)}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderInlineMarkdown escapes HTML first, then only allows a small whitelisted markdown subset -->
							<li>{@html renderInlineMarkdown(step, scaleFactor)}</li>
						{/each}
					</ol>
				{/each}
			</section>
		{/if}
	</div>

	{#if gallery.length}
		<div class="gallery">
			{#each gallery as image, i (i)}
				<img src={image} alt="" onerror={hideOnError} />
			{/each}
		</div>
	{/if}

	{#if recipe.notes}
		<hr />
		<section>
			<h2>{t(data.locale, 'notes')}</h2>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderInlineMarkdown escapes HTML first, then only allows a small whitelisted markdown subset -->
			<p>{@html renderInlineMarkdown(recipe.notes)}</p>
		</section>
	{/if}

	{#if recipe.nutrition}
		<hr />
		<section>
			<h2>{t(data.locale, 'nutrition')}</h2>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderInlineMarkdown escapes HTML first, then only allows a small whitelisted markdown subset -->
			<p>{@html renderInlineMarkdown(recipe.nutrition)}</p>
		</section>
	{/if}

	{#if recipe.link}
		<p class="source">
			{t(data.locale, 'source')}:
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderInlineMarkdown escapes HTML first, then only allows a small whitelisted markdown subset -->
			{@html renderInlineMarkdown(`[${recipe.link}](${recipe.link})`)}
		</p>
	{/if}
</article>

<style>
	article {
		max-width: 760px;
		margin: 0 auto;
	}

	.hero {
		width: 100%;
		max-height: 420px;
		object-fit: cover;
		border-radius: var(--radius);
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: var(--font-size-recipe-title);
		line-height: 1.2;
		margin-bottom: 0.35rem;
	}

	.description {
		color: var(--color-text-muted);
		font-size: var(--font-size-description);
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
		margin-top: 0.75rem;
		font-size: var(--font-size-meta);
	}

	.meta-item {
		color: var(--color-highlight);
		font-weight: 600;
	}

	.meta-item:not(:last-child)::after {
		content: '·';
		margin-left: 0.5rem;
		color: var(--color-border-strong);
	}

	.flags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.85rem;
	}

	.flag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font: inherit;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.35rem 0.8rem;
		cursor: pointer;
	}

	.flag .icon {
		font-size: 1.05rem;
		line-height: 1;
		color: var(--color-text-muted);
	}

	.flag .icon.filled {
		color: var(--color-highlight);
	}

	.categories {
		margin-top: 0.6rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.category {
		font: inherit;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.1rem 0.5rem;
		cursor: pointer;
	}

	.category:hover {
		border-color: var(--color-highlight);
		color: var(--color-highlight);
	}

	.category.static {
		display: inline-block;
		cursor: default;
	}

	.category.static:hover {
		border-color: var(--color-border);
		color: var(--color-text-muted);
	}

	.category-input {
		font: inherit;
		font-size: 0.8rem;
		color: var(--color-text);
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: 6px;
		padding: 0.1rem 0.5rem;
		width: 7rem;
	}

	.category-input:focus {
		outline: none;
		border-color: var(--color-highlight);
	}

	.action-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.secondary-actions {
		display: flex;
		gap: 8px;
		margin-left: auto;
	}

	.cook-mode-button {
		display: inline-block;
		padding: 0.6rem 1.2rem;
		border-radius: var(--radius);
		background: var(--color-highlight);
		color: #fff;
		font-weight: 600;
		text-decoration: none;
	}

	.export-link,
	.print-link {
		display: inline-block;
		font: inherit;
		padding: 0.6rem 1.2rem;
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-text-muted);
		text-decoration: none;
		cursor: pointer;
	}

	.export-link:hover,
	.print-link:hover {
		border-color: var(--color-highlight);
		color: var(--color-highlight);
	}

	.body-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 700px) {
		.body-grid {
			grid-template-columns: 1fr 1.4fr;
		}
	}

	.ingredients {
		background: var(--color-ingredients-bg);
		padding: 1.5rem 1.75rem;
	}

	.ingredients-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	.instructions {
		padding: 1.5rem 1.75rem;
	}

	h2 {
		font-size: var(--font-size-section);
		margin-bottom: 0.5rem;
	}

	h3 {
		font-size: 1.05rem;
		font-family: var(--font-body);
		font-weight: 600;
		margin-top: 1.1rem;
	}

	ul,
	ol {
		padding-left: 1.2rem;
	}

	li {
		margin-bottom: 0.5rem;
	}

	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.gallery img {
		border-radius: var(--radius);
		aspect-ratio: 1;
		object-fit: cover;
	}

	.source {
		margin-top: 2rem;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	/* Wie in Mela: kein eigener PDF-Generator, nur eine aufgeräumte Ansicht für
	   den normalen Browser-Druckdialog — orientiert an einem echten Mela-PDF-
	   Export. Foto oben links, daneben eine kompakte Überschrift; Zutaten und
	   Zubereitung teilen sich dieselbe schmal/breit-Spaltenaufteilung wie der
	   Kopfbereich. Abschnittsüberschriften ("Zutaten", "Zubereitung", …) fallen
	   komplett weg — die Spaltenposition allein macht die Zuordnung klar. */
	@media print {
		.flags,
		.categories,
		.action-row,
		.gallery {
			display: none;
		}

		article {
			max-width: 100%;
			font-size: 11pt;
			line-height: 1.35;
		}

		.header-block,
		.body-grid {
			grid-template-columns: 30% 1fr;
			column-gap: 1.25rem;
			align-items: start;
		}

		.header-block {
			display: grid;
		}

		.hero {
			grid-column: 1;
			grid-row: 1 / span 3;
			width: 100%;
			max-height: 180px;
			object-fit: cover;
			border-radius: var(--radius);
			margin: 0;
		}

		h1 {
			grid-column: 2;
			grid-row: 1;
			font-size: 19pt;
			line-height: 1.2;
			margin-bottom: 0.25em;
		}

		.description {
			grid-column: 2;
			grid-row: 2;
			font-size: 10pt;
		}

		.meta-row {
			grid-column: 2;
			grid-row: 3;
			font-size: 9pt;
			margin-top: 0.4em;
		}

		hr {
			margin: 0.6rem auto;
		}

		.ingredients,
		.instructions {
			background: none;
			padding: 0;
		}

		h2 {
			display: none;
		}

		h3 {
			font-size: 11pt;
			margin-top: 0.6em;
			margin-bottom: 0.2em;
		}

		li {
			margin-bottom: 0.25rem;
		}

		.ingredients ul {
			list-style: none;
			padding-left: 0;
		}
	}
</style>
