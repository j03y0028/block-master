# Security policy

Block Master is a hobby project, provided **as is** without warranty (see the AGPL-3.0). It is a read-only explorer and never handles keys or funds,
but it does connect to your Bitcoin node's RPC and Electrum server.

## How it's set up

- The web container runs nginx as an unprivileged user (uid 1000) and serves static files plus a proxy to the backend.
- The backend is the unmodified upstream `mempool/backend` image, pinned by digest. The database is MariaDB, pinned by digest.
- On myNode, the database and RPC secrets live in `/mnt/hdd/mynode/blockmaster/blockmaster.env` (mode 600). The RPC password is read from myNode's settings and never committed or logged.
- Never commit `.env` or `data-docker/`. They are in `.gitignore`.
- Don't expose ports 4090/4091 to the internet. Use myNode's Tor or VPN options for remote access.

## Supported versions

Only the latest release and `main` get fixes. Upstream backend issues are fixed by moving to a newer pinned upstream image.

## Reporting a vulnerability

Please **do not open a public issue**.

- Report privately through GitHub: **Security → Report a vulnerability** on
  [github.com/j03y0028/block-master](https://github.com/j03y0028/block-master/security/advisories/new).
- Include the version/commit, your setup (Docker or myNode), steps to reproduce, and the impact.
- Expect an acknowledgement within about a week. Fixes are credited unless you prefer otherwise.

If the problem is in the upstream mempool backend or frontend code, please also report it to The Mempool Open Source Project through their security process.
