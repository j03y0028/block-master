# Contributing to Block Master

Thanks for helping! Block Master is a small, independent fork of the Mempool Open Source Project, focused on being **friendly** and **self-hosted**.

## Ground rules

- **License:** Block Master is AGPL-3.0. By opening a pull request you agree that your contribution is licensed under the
  GNU AGPL-3.0, the same as the rest of the project. Only submit code you have the right to submit.
- **No mempool.space branding.** Don't add the Mempool name, logos or service links to anything users see. Credit upstream in code comments or docs.
- **No third-party calls at runtime.** The app must work against the user's own node only. No analytics and no remote assets.
- **Keep it plain.** New UI text should make sense to someone who just installed their first node.
- **Demo data** (screenshots, fixtures, examples) must use made-up names and addresses, never real people.

## Getting started

```bash
cd frontend
npm ci
npm run test:design
npm run build
npm run lint
```

- Holiday rules: `frontend/src/app/shared/holidays.ts`; palettes: `frontend/src/app/shared/palettes.ts`. Tests live in `frontend/tests/`. Every palette color and every holiday accent must pass WCAG AA (the tests enforce it).
- Logos: edit `branding/build-logos.mjs`, then run `npm run logos` (CI checks that the SVGs are up to date). Favicons and PNGs come from `node branding/render-pngs.mjs` (needs puppeteer and Chrome).
- myNode packaging: `mynode/` and `scripts/package-mynode.sh`. Test the installer with `MYNODE_SIM=1 MYNODE_ROOT=/tmp/fake ./mynode/install-mynode.sh --yes`.

## Pull requests

- One topic per PR, with a short description and screenshots for UI changes (dark mode, desktop and mobile).
- CI has to pass.
- Backend fixes that aren't specific to Block Master belong upstream at [mempool/mempool](https://github.com/mempool/mempool).

Security problems: see [SECURITY.md](SECURITY.md). Please don't open public issues for them.
