<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { t } from '$lib/i18n';
	import placeholderImg from '$lib/assets/quince-placeholder.png';
	import { recipeImageUrl } from '$lib/urls';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let query = $state('');
	let sidebarOpen = $state(false);
	/** "" = kein Kategorie-Filter aktiv. */
	let flagFilter = $state<'all' | 'favorite' | 'wantToCook'>('all');
	let categoryFilter = $state('');

	/** Fällt auf die Quitten-Illustration zurück, wenn ein Foto fehlt oder
	 *  defekt ist — nur für die Vorschau in der Seitenleiste, nicht fürs
	 *  große Header-Bild auf der geöffneten Rezeptseite. */
	function useThumbFallback(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		img.onerror = null;
		img.src = placeholderImg;
	}

	// Wie in Mela: Kategorien sind die einzige Organisations-Taxonomie, "Favorit"
	// und "Möchte ich kochen" sind zwei eingebaute Sonder-Filter obendrauf.
	let allCategories = $derived.by(() => {
		// Rein lokale Zwischenmenge innerhalb dieser einen Berechnung — landet nie
		// im State, SvelteSet wäre hier nur unnötiger Reaktivitäts-Overhead.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const set = new Set<string>();
		for (const recipe of data.recipes) for (const category of recipe.categories) set.add(category);
		return Array.from(set).sort((a, b) => a.localeCompare(b, data.locale));
	});

	let filtered = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return data.recipes.filter((recipe) => {
			if (flagFilter === 'favorite' && !recipe.favorite) return false;
			if (flagFilter === 'wantToCook' && !recipe.wantToCook) return false;
			if (categoryFilter && !recipe.categories.includes(categoryFilter)) return false;
			if (!needle) return true;
			return (
				recipe.title.toLowerCase().includes(needle) ||
				recipe.categories.some((category) => category.toLowerCase().includes(needle))
			);
		});
	});

	// Der Kochmodus ist bewusst ablenkungsfrei — keine Rezeptliste daneben.
	// Im READ_ONLY-Modus gibt es gar keine Bibliothek, die eine Seitenleiste
	// zeigen könnte — data.recipes ist dort immer leer.
	let isCookMode = $derived(page.url.pathname.endsWith('/cook'));
	let hideSidebar = $derived(isCookMode || data.readOnly);
</script>

{#if hideSidebar}
	{@render children()}
{:else}
	<div class="library">
		<button class="sidebar-toggle" type="button" onclick={() => (sidebarOpen = !sidebarOpen)}>
			{sidebarOpen
				? t(data.locale, 'hideRecipes')
				: t(data.locale, 'recipeCountToggle', { count: data.recipes.length })}
		</button>

		<aside class="sidebar" class:open={sidebarOpen}>
			<input
				class="search"
				type="search"
				placeholder={t(data.locale, 'searchPlaceholder')}
				aria-label={t(data.locale, 'searchAriaLabel')}
				bind:value={query}
			/>

			<div class="flag-filter">
				<button
					type="button"
					class:active={flagFilter === 'all'}
					onclick={() => (flagFilter = 'all')}
				>
					{t(data.locale, 'filterAll')}
				</button>
				<button
					type="button"
					class:active={flagFilter === 'favorite'}
					onclick={() => (flagFilter = 'favorite')}
				>
					{t(data.locale, 'filterFavorites')}
				</button>
				<button
					type="button"
					class:active={flagFilter === 'wantToCook'}
					onclick={() => (flagFilter = 'wantToCook')}
				>
					{t(data.locale, 'filterWantToCook')}
				</button>
			</div>

			{#if allCategories.length}
				<select
					class="category-filter"
					aria-label={t(data.locale, 'categoryFilterAriaLabel')}
					bind:value={categoryFilter}
				>
					<option value="">{t(data.locale, 'categoryFilterAll')}</option>
					{#each allCategories as category (category)}
						<option value={category}>{category}</option>
					{/each}
				</select>
			{/if}

			{#if filtered.length === 0}
				<p class="empty">{t(data.locale, 'noResults')}</p>
			{:else}
				<ul class="recipe-list">
					{#each filtered as recipe (recipe.storageId)}
						<li>
							<a
								href={resolve('/recipe/[id]', { id: encodeURIComponent(recipe.storageId) })}
								class:active={page.params.id === recipe.storageId}
								onclick={() => (sidebarOpen = false)}
							>
								<img
									src={recipe.imageCount > 0 ? recipeImageUrl(recipe.storageId, 0) : placeholderImg}
									alt=""
									loading="lazy"
									onerror={useThumbFallback}
								/>
								<span class="text">
									<span class="title">{recipe.title}</span>
									{#if recipe.categories.length}
										<span class="tags">{recipe.categories.join(' · ')}</span>
									{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>

		<div class="content">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.library {
		max-width: var(--content-max-width);
		margin: 0 auto;
		padding: 0 1.25rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	.sidebar-toggle {
		justify-self: start;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.45rem 0.9rem;
		color: var(--color-text);
		font: inherit;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.sidebar {
		display: none;
		min-width: 0;
	}

	.sidebar.open {
		display: block;
	}

	.search {
		width: 100%;
		padding: 0.5rem 0.7rem;
		margin-bottom: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		font-size: 0.9rem;
	}

	.search:focus {
		outline: none;
		border-color: var(--color-border-strong);
	}

	.flag-filter {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}

	.flag-filter button {
		font: inherit;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.3rem 0.65rem;
		cursor: pointer;
	}

	.flag-filter button.active {
		color: #fff;
		background: var(--color-highlight);
		border-color: var(--color-highlight);
		font-weight: 600;
	}

	.category-filter {
		width: 100%;
		padding: 0.4rem 0.6rem;
		margin-bottom: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		font-size: 0.85rem;
	}

	.recipe-list {
		list-style: none;
		padding: 0;
	}

	.recipe-list a {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.4rem;
		border-radius: var(--radius);
		text-decoration: none;
		color: inherit;
	}

	.recipe-list a:hover {
		background: var(--color-ingredients-bg);
	}

	.recipe-list a.active {
		background: var(--color-ingredients-bg);
		font-weight: 600;
	}

	.recipe-list img {
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: 6px;
		object-fit: cover;
		background: var(--color-ingredients-bg);
	}

	.text {
		min-width: 0;
	}

	.title {
		display: block;
		font-size: 0.92rem;
		line-height: 1.3;
	}

	.tags {
		display: block;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.empty {
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.content {
		min-width: 0;
	}

	@media (min-width: 900px) {
		.library {
			grid-template-columns: 260px 1fr;
			/* Ohne das würde Grid beide Spalten auf die Höhe der jeweils
			   längeren strecken — bei einem kurzen Rezept bliebe dann unten in
			   der (kürzeren) Seitenleiste eine leere Fläche stehen. */
			align-items: start;
			gap: 2.5rem;
		}

		.sidebar-toggle {
			display: none;
		}

		.sidebar {
			display: flex;
			flex-direction: column;
			position: sticky;
			top: 1.5rem;
			/* 4rem = main-Padding oben+unten (je 2rem); 1.5rem oben (top) und
			   1.5rem unten sind der Sicherheitsabstand zu Header/Footer. */
			max-height: calc(100vh - var(--header-height, 0px) - var(--footer-height, 0px) - 7rem);
		}

		.recipe-list {
			overflow-y: auto;
			margin: 0 -0.25rem;
			padding: 0 0.25rem;
		}
	}
</style>
