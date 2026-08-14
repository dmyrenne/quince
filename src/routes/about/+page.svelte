<svelte:head>
	<title>About Quince</title>
</svelte:head>

<div class="container">
	<article class="card about">
		<h1>About Quince</h1>

		<p>
			Quince is a self-hosted, open-source recipe manager in the look &amp; feel of <strong
				>Mela</strong
			>.
		</p>

		<p>
			This project was created to share recipes with people who don't have an Apple device, without
			them having to miss out on scaling recipes or cook mode.
		</p>

		<p>
			I'm not a developer myself so I built this project with Claude. It doesn't come close to the
			original. If you don't already have it, download Mela and treat the developer to the in-app
			purchase! I haven't regretted it.
		</p>

		<ul class="links">
			<li>
				<a href="https://mela.recipes/" target="_blank" rel="noopener noreferrer">mela.recipes</a>
			</li>
			<li>
				<a
					href="https://apps.apple.com/us/app/mela-recipe-manager/id1548466041"
					target="_blank"
					rel="noopener noreferrer">Mela on the App Store (iOS)</a
				>
			</li>
			<li>
				<a
					href="https://apps.apple.com/us/app/mela-recipe-manager/id1568924476?mt=12"
					target="_blank"
					rel="noopener noreferrer">Mela on the Mac App Store</a
				>
			</li>
		</ul>

		<p>
			A big thank you to <strong>Silvio Rizzi</strong>, the developer of Mela —
			<a href="https://gloria.social/@rizzi" target="_blank" rel="noopener noreferrer"
				>@rizzi@gloria.social</a
			>!
		</p>

		<p class="disclaimer">
			Quince is a fan-made, unofficial project and is not affiliated with Mela or its developer.
		</p>
	</article>
</div>

<style>
	.about {
		max-width: 620px;
		margin: 0 auto;
		padding: 2rem;
	}

	.links {
		padding-left: 1.2rem;
	}

	.links li {
		margin-bottom: 0.4rem;
	}

	.disclaimer {
		margin-top: 2rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
</style>
