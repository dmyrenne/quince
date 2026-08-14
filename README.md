# Quince

A self-hosted, open-source recipe manager in the look and feel of
[Mela](https://mela.recipes/).

Quince reads Mela's own `.melarecipe` / `.melarecipes` files, so you can share your recipes with
people who don't own an Apple device — without making them give up ingredient scaling or a proper
cook mode.

**Shoutout to the original:** Quince is inspired by Mela, a beautiful recipe app for iOS and Mac.
If you like Quince, go look at the real thing and buy the in-app purchase:

- [mela.recipes](https://mela.recipes/)
- [Mela on the App Store (iOS)](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041)
- [Mela on the Mac App Store](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476?mt=12)

Quince is an unofficial, fan-built project and is not affiliated with Mela or its developer.
See [ROADMAP.md](ROADMAP.md) for what's planned.

## Features

- Reads `.melarecipe` files and whole `.melarecipes` libraries (ZIP)
- Ingredient scaling that understands fractions, ranges and German number formats
- Cook mode: step-by-step, ingredients always visible, multiple timers, screen pulse on alarm
- Search across names and tags, favourites, a want-to-cook list and categories
- Clean print / "Save as PDF" view modelled on Mela's own
- UI in German or English, picked automatically from the browser language
  (recipes themselves are never translated)
- Export any recipe back out as a `.melarecipe`

## ⚠️ Security: no login, by design

Quince has **no accounts and no authentication whatsoever**. Everyone who can reach the port can
read, upload, edit and delete every recipe.

- **Normal (writable) mode belongs on your own network** — behind a VPN, or behind a reverse proxy
  that does the authentication for you. Do not expose a writable instance to the open internet.
- **For a public instance, use `READ_ONLY=true`** (see below). Nothing is written to disk, there is
  no library to browse, and uploads live only in memory for an hour.

## Self-hosting with Docker

### From the published image

```bash
docker run -d --name quince -p 3000:3000 -v quince-data:/data -e ORIGIN=http://localhost:3000 ghcr.io/dmyrenne/quince:latest
```

### From source with Compose

```bash
cp .env.example .env
```

Adjust `.env` (see below), then start:

```bash
docker compose up -d
```

Quince then runs at [http://localhost:3000](http://localhost:3000). Recipes are stored as
`.melarecipe` files under `./data/recipes` via a bind mount — no account, so every visitor of the
instance sees the same recipes. Put a reverse proxy of your choice (nginx, Caddy, Traefik, …) in
front of it for outside access.

Without a `.env` the defaults from `docker-compose.yml` apply, which match a local instance on
port 3000.

### Configuration (`.env`)

| Variable          | Default                 | Meaning                                                    |
| ----------------- | ----------------------- | ---------------------------------------------------------- |
| `QUINCE_PORT`     | `3000`                  | Port on the host                                           |
| `ORIGIN`          | `http://localhost:3000` | **Important:** the URL Quince is actually reached under    |
| `QUINCE_DATA`     | `./data`                | Where recipes are stored on the host                       |
| `BODY_SIZE_LIMIT` | `128M`                  | Maximum upload size                                        |
| `READ_ONLY`       | `false`                 | Ephemeral, read-only mode for public instances (see below) |

`ORIGIN` has to match the real URL, otherwise SvelteKit's CSRF protection rejects every upload with
"Cross-site POST form submissions are forbidden". Behind a reverse proxy, set something like
`ORIGIN=https://recipes.example.com`. This only bites in the Docker build, not in the dev server.

### Read-only mode for public instances

With `READ_ONLY=true`, Quince becomes a viewer that is safe to put on the open internet:

- Uploads are kept **in memory only** and never touch the disk — nothing persists across a restart
- Each upload expires after an hour; the cache is capped in both entry count and total size
- There is no sidebar and no library — you only ever see the recipe you just uploaded
- Favourites, want-to-cook and category editing are hidden, since there is nothing to save them to

Because nothing is written, the `/data` volume can simply be left out:

```bash
docker run -d --name quince-demo -p 3000:3000 -e READ_ONLY=true -e ORIGIN=https://demo.example.com ghcr.io/dmyrenne/quince:latest
```

This cannot be detected automatically — a fresh container filesystem looks exactly like a freshly
mounted volume at startup — hence the explicit switch.

## Usage

Opening the start page takes you straight to the most recently added recipe. On the left is a
sidebar with all recipes plus a search over names and tags; on narrow screens it folds into a
button.

### Getting recipes in

Two ways, both understanding single recipes (`.melarecipe`) as well as whole libraries
(`.melarecipes`, a ZIP holding many recipes):

1. **Through the web UI** — "Upload Recipe".
2. **Straight into the data directory** — copy files into `data/recipes/`. Single `.melarecipe`
   files are picked up immediately and the filename becomes the ID. A `.melarecipes` archive
   dropped there is unpacked on the next page load; the archive itself then moves to
   `data/imported/`.

Very large libraries go faster via route 2, since nothing has to travel through the browser.

## Development

```bash
npm install
npm run dev -- --open
```

Recipes land under `./data/recipes` in dev too.

```bash
npm run lint    # prettier + eslint
npm run check   # svelte-check
npm run build   # production build
```

## Tech stack

SvelteKit with the Node adapter, no database — recipes are plain files on disk (or, in read-only
mode, plain objects in memory). Headings in Playfair Display, body text in Geist, both self-hosted
via Fontsource.

## License

[MIT](LICENSE) © Daniel Myrenne. Mela, its file format and its design are the work of
Silvio Rizzi; this project only borrows the look, not the code.
