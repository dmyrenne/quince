<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from '$lib/i18n';
	import type { PageProps } from './$types';

	let { form, data }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{t(data.locale, 'uploadTitle')} – Quince</title>
</svelte:head>

<div class="container">
	<div class="upload card">
		<h1>{t(data.locale, 'uploadTitle')}</h1>
		<p class="hint">
			{t(data.locale, data.readOnly ? 'uploadHintReadOnly' : 'uploadHint')}
		</p>

		<form
			method="POST"
			enctype="multipart/form-data"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<input
				type="file"
				name="file"
				accept=".melarecipe,.melarecipes,application/json,application/zip"
				required
			/>
			<button type="submit" disabled={submitting}>
				{submitting ? t(data.locale, 'uploadButtonBusy') : t(data.locale, 'uploadButton')}
			</button>
		</form>

		{#if form?.message}
			<p class="error">{form.message}</p>
		{/if}
	</div>
</div>

<style>
	.upload {
		max-width: 520px;
		margin: 0 auto;
		padding: 2rem;
	}

	.hint {
		color: var(--color-text-muted);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.25rem;
	}

	input[type='file'] {
		padding: 0.75rem;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius);
		background: var(--color-bg);
	}

	button {
		padding: 0.65rem 1.2rem;
		border: none;
		border-radius: var(--radius);
		background: var(--color-quantity);
		color: #fff;
		font-size: 1rem;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.error {
		margin-top: 1rem;
		color: #a33;
	}
</style>
