<p align="center">
  <img src="docs/logos/logo-default.png" width="140" alt="Block Master logo: a Bitcoin block wearing a crown">
</p>

<h1 align="center">Block Master</h1>

<p align="center"><b>Master every block. Your node, your explorer.</b><br>
A friendly, self-hosted Bitcoin block explorer and mempool visualizer with U.S. holiday themes, made for myNode and other home nodes.</p>

> **Independent fork. Not affiliated with mempool.space.**
> Block Master is an independent, community fork of the open-source
> [Mempool Open Source Project®](https://github.com/mempool/mempool) (v3.3.2). It is **not** made, endorsed or supported by
> mempool.space, Mempool Space K.K. or The Mempool Open Source Project. "Mempool", "mempool.space" and their logos are
> trademarks of their owners. Block Master doesn't use them. All Block Master names, logos and artwork in this repository are original.
> The code is licensed under the **GNU AGPL-3.0**, the same as upstream. See [License & attribution](#license--attribution).

![Block Master dashboard, default theme](docs/screenshots/dashboard-default.png)

## Why Block Master?

Mempool is a great explorer. Block Master keeps its engine and makes the first screen easier for people new to Bitcoin:

- **"What fee should I pay?" card**: four plain choices (*In a hurry*, *Normal*, *Patient*, *No rush*) with sat/vB, an estimate in sats for a typical payment, and the price in your currency.
- **"What am I looking at?" explainer**: three short sentences about the waiting room, the blocks and the fees. You can collapse it.
- **Plain-language tooltips**: anything with a dotted underline or a ⓘ explains itself when you hover over it.
- **Cleaner first screen**: a waiting/mined legend over the block strip, and the fee card plus Recent Blocks first. The power-user cards are still there, just lower on the page.
- **U.S. holiday themes**: the crowned-block logo, accent colors and a small dismissible banner change automatically around 11 U.S. holidays. Everything stays readable in dark mode.
- **Self-hosted first**: no mempool.space branding, services, analytics or promo downloads. Footer links point to this repository.
- **myNode package**: a one-command installer that uses your node's Bitcoin Core and Electrs.

## Holiday themes

The theme is chosen from your browser's **local date**. Floating holidays are computed every year (for example, Thanksgiving is the 4th Thursday of November), so nothing needs updating.

| Holiday | Date rule | Theme shows | Logo |
|---|---|---|---|
| New Year's Day | Jan 1 | Dec 31 – Jan 2 | <img src="docs/logos/logo-new-years.png" width="40"> |
| Martin Luther King Jr. Day | 3rd Monday of January | 2 days before → day | <img src="docs/logos/logo-mlk.png" width="40"> |
| Presidents' Day | 3rd Monday of February | 2 days before → day | <img src="docs/logos/logo-presidents.png" width="40"> |
| Memorial Day | last Monday of May | 2 days before → day | <img src="docs/logos/logo-memorial.png" width="40"> |
| Juneteenth | Jun 19 | Jun 18 – 20 | <img src="docs/logos/logo-juneteenth.png" width="40"> |
| Independence Day | Jul 4 | Jul 1 – 5 | <img src="docs/logos/logo-independence.png" width="40"> |
| Labor Day | 1st Monday of September | 2 days before → day | <img src="docs/logos/logo-labor.png" width="40"> |
| Halloween | Oct 31 | Oct 25 – 31 | <img src="docs/logos/logo-halloween.png" width="40"> |
| Veterans Day | Nov 11 | Nov 9 – 11 | <img src="docs/logos/logo-veterans.png" width="40"> |
| Thanksgiving | 4th Thursday of November | 3 days before → day after | <img src="docs/logos/logo-thanksgiving.png" width="40"> |
| Christmas | Dec 25 | Dec 15 – 26 | <img src="docs/logos/logo-christmas.png" width="40"> |
| *(no holiday)* | | rest of the year | <img src="docs/logos/logo-default.png" width="40"> |

**Settings:** the **Holiday theme** selector in the footer lets you pick **Auto** (the default), any single holiday, or **Off** (always the default logo and colors). Your choice is saved in the browser. To preview a theme without saving it, add `?holiday=veterans` (or `christmas`, `independence`, `halloween`…) to any URL. Each holiday's banner can be dismissed once per year, and "Turn off theme" in the banner switches to **Off**.

| Veterans Day (Nov 11) | Independence Day (Jul 4) |
|---|---|
| ![Veterans Day theme](docs/screenshots/dashboard-veterans.png) | ![Independence Day theme](docs/screenshots/dashboard-independence.png) |
| **Christmas** | **Halloween** |
| ![Christmas theme](docs/screenshots/dashboard-christmas.png) | ![Halloween theme](docs/screenshots/dashboard-halloween.png) |

More screenshots: [About page](docs/screenshots/about.png), [footer with the theme selector](docs/screenshots/footer-settings.png), [mobile](docs/screenshots/mobile-veterans.png).

The holiday rules live in [`frontend/src/app/shared/holidays.ts`](frontend/src/app/shared/holidays.ts) (pure TypeScript, with no Angular). The logos come from
[`branding/build-logos.mjs`](branding/build-logos.mjs), and the favicons and PNGs from [`branding/render-pngs.mjs`](branding/render-pngs.mjs).

## Install on myNode

See **[docs/mynode-install.md](docs/mynode-install.md)** for the full guide. In short:

1. On myNode, make sure **Bitcoin** is synced and **Electrs** is installed and synced.
2. Build the package on any computer with Docker (`scripts/package-mynode.sh`) or download a release tarball, then copy it to the node:
   ```bash
   scp build/blockmaster-mynode-v1.0.0.tar.gz admin@mynode.local:~
   ```
3. On the myNode:
   ```bash
   tar xzf blockmaster-mynode-v1.0.0.tar.gz && cd blockmaster-mynode-v1.0.0
   sudo ./install-mynode.sh
   ```
4. Open **http://mynode.local:4090** (or **https://mynode.local:4091**). Block Master also shows up in the myNode app list, where you can start, stop and uninstall it.

The app uses myNode's own Bitcoin RPC account, the same one the built-in Mempool app uses. It doesn't change or restart bitcoind. It runs alongside the built-in Mempool app (ports 4090/4091 and Docker subnet 172.29.0.0/24, so there are no conflicts).

## Run with Docker (any Linux host)

Block Master needs a synced **Bitcoin Core** (txindex is recommended) and, for address pages, an **Electrum server** (electrs or Fulcrum).

```bash
git clone https://github.com/j03y0028/block-master.git && cd block-master
cp .env.example .env        # set CORE_RPC_* , ELECTRUM_*, and two database passwords
mkdir -p data-docker/cache data-docker/mysql
docker compose up -d --build
# → http://localhost:4090
```

| Service | Image | What it is |
|---|---|---|
| `web` | `blockmaster/frontend` (built from this repo) | the Block Master UI on nginx; proxies `/api` and WebSocket to `api` |
| `api` | `mempool/backend:v3.3.2` (pinned by digest) | the **unmodified** upstream mempool backend (AGPL-3.0) |
| `db` | `mariadb:10.11.10` (pinned by digest) | statistics and mining database |

The backend is used as-is because Block Master's changes are all in the UI. To build the backend from source instead, use
[`docker/backend`](docker/backend) and the [`backend/`](backend) folder (unchanged upstream code), and set `image:` in `docker-compose.yml`.

## Develop

```bash
cd frontend
npm ci
npm run test:holidays     # holiday date and contrast tests (node --test)
npm run logos             # regenerate the SVG logos after editing branding/build-logos.mjs
npm run build             # production build (all locales) → dist/
npm run lint
```

To look at a production build against live data without a node, `node scripts/preview-server.js 4200` serves `dist/` and proxies
`/api` to `PREVIEW_API` (by default the public mempool.space API; use your own backend URL if you have one). This is only for development; Block Master never calls third-party APIs when it runs on your node.

CI (`.github/workflows/ci.yml`) runs the holiday tests, checks that the logos are up to date, validates both compose files, runs `bash -n` on the scripts, and does the lint and production build.

## What changed from upstream

- New name, logo family, favicons, social preview, page titles and meta tags. All mempool.space trademarks, logos and service links are removed from the UI.
- Holiday theme engine (`holidays.ts`, `HolidayThemeService`, banner, selector, logo component).
- Fee helper card, explainer card, tooltips, dashboard legend and card order. "Mempool Goggles" is renamed to "Next Block Preview".
- About, Terms, Privacy and Trademark pages rewritten for a self-hosted fork.
- No promo video or sponsor downloads. `sync-assets` uses Node instead of rsync.
- Docker and myNode packaging, a CI workflow, and these docs.

The upstream import is commit `9b75f724` (mempool v3.3.2). See [NOTICE](NOTICE).

## Known limitations

- New strings are English only (other locales fall back to English for them).
- Some FAQ / API-docs text still describes upstream's public infrastructure.
- The myNode package is tested with a simulated myNode and myNode's real app loader, but it hasn't yet been installed on real hardware. Please report your results.

## License & attribution

Block Master is free software under the **GNU Affero General Public License v3.0** ([LICENSE](LICENSE), [COPYING.md](COPYING.md)).
It is a modified version of [The Mempool Open Source Project®](https://github.com/mempool/mempool),
Copyright © 2019–2026 The Mempool Open Source Project developers. Modifications are Copyright © 2026 the Block Master contributors.
If you run a modified version for other people over a network, the AGPL requires you to offer them its source code.
The footer's "Source code" link does this for you. Point it at your fork if you change the code.

Mempool and mempool.space are trademarks of Mempool Space K.K. Block Master is not affiliated with them, and these marks are used here only to state where the code comes from.
