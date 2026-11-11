# Installing Block Master on myNode

Block Master runs on myNode as a **custom app**, packaged with myNode's app SDK the same way as the built-in apps. It runs next to
myNode's own Mempool app and doesn't change it.

| | |
|---|---|
| Web | `http://mynode.local:4090` and `https://mynode.local:4091` |
| Data | `/mnt/hdd/mynode/blockmaster/` (MariaDB, cache, `blockmaster.env`) |
| Service | `blockmaster.service` (Docker Compose: `web`, `api`, `db`) |
| Docker network | `172.29.0.0/24` (myNode Mempool uses 172.26, Dojo uses 172.28) |
| Bitcoin RPC | myNode's `mynode` RPC user; the password is read from `/mnt/hdd/mynode/settings/.btcrpcpw` at every start |
| Electrum | myNode's Electrs on port 50001 |

Nothing about bitcoind is changed and bitcoind is not restarted.

## Requirements

- myNode (x86_64 or arm64, such as a Raspberry Pi 4/5 with 4 GB RAM or more) with **Docker** enabled. Docker is on by default on current myNode releases.
- **Bitcoin** fully synced. **Electrs** installed, enabled and synced (myNode's Mempool app needs it too).
- About 2 GB of free disk space for images and the database.

## 1. Get the package

**Option A: download a release** (when one is published) from
[github.com/j03y0028/block-master/releases](https://github.com/j03y0028/block-master/releases):
`blockmaster-mynode-v3.0.0.tar.gz`.

**Option B: build it yourself** on any Linux or macOS computer with Docker and buildx:

```bash
git clone https://github.com/j03y0028/block-master.git && cd block-master
docker run --privileged --rm tonistiigi/binfmt --install arm64   # only if you build arm64 on an x86 computer
scripts/package-mynode.sh                 # amd64 + arm64;  ARCHS=arm64 scripts/package-mynode.sh for a Pi only
ls build/blockmaster-mynode-v3.0.0.tar.gz
```

The package contains the Block Master web image for each CPU type, so myNode doesn't need to build anything. The backend and
MariaDB images are pulled from Docker Hub during install and pinned by digest in `app_data/images.env`.

## 2. Copy it to the node and install

```bash
scp build/blockmaster-mynode-v3.0.0.tar.gz admin@mynode.local:~
ssh admin@mynode.local
tar xzf blockmaster-mynode-v3.0.0.tar.gz
cd blockmaster-mynode-v3.0.0
sudo ./install-mynode.sh            # add --yes to skip the question; --port=4095 to use another HTTP port
```

The installer:

1. checks that this is a myNode with Docker, Bitcoin and Electrs, and that the package matches the CPU (checksums too);
2. copies the app to `/usr/share/mynode_apps/blockmaster` and registers it (`mynode-manage-apps init`);
3. writes `/mnt/hdd/mynode/blockmaster/blockmaster.env` (mode 600) with randomly generated database passwords;
4. runs myNode's install step, which loads the web image and pulls the backend and database images;
5. enables and starts `blockmaster.service`, then waits until the page answers.

It's safe to run it again (for example to upgrade). Your database and passwords are kept.

When it says **Done**, open **http://mynode.local:4090**. Right after install, the backend spends a few minutes indexing recent
blocks, and the dashboard fills in as it goes. Block Master is also listed in the myNode web UI under apps, where you can start, stop,
see logs or uninstall it.

## Upgrading

Download or build the new package and run `sudo ./install-mynode.sh` from it again.

## Uninstall

```bash
cd blockmaster-mynode-v3.0.0
sudo ./uninstall-mynode.sh           # removes containers, image and app registration; keeps your data
sudo ./uninstall-mynode.sh --purge   # also deletes /mnt/hdd/mynode/blockmaster
```

You can also uninstall from the myNode app page. bitcoind, Electrs and the built-in Mempool app are never touched.

## Troubleshooting

| Problem | What to check |
|---|---|
| Page doesn't load | `sudo systemctl status blockmaster` and `sudo journalctl -u blockmaster -n 50`. The database starts first, so give it a minute. |
| "install step failed" | `sudo journalctl -t mynode_manage_apps -n 100`, plus the log path the installer prints. |
| Address pages are empty | Electrs must be synced: myNode home → Electrum Server. |
| Dashboard empty / RPC errors | `sudo docker ps --filter name=blockmaster` then `sudo docker logs <the api container>`. Bitcoin must be synced. The RPC password is refreshed from myNode settings on every start: `sudo systemctl restart blockmaster`. |
| Port already used | Reinstall with `--port=NNNN`. |
| Holiday theme isn't wanted | Footer → **Holiday theme** → **Off**. The setting is stored per browser. |

## Files

```
mynode/
├── install-mynode.sh / uninstall-mynode.sh
└── blockmaster/
    ├── blockmaster.json          app definition (myNode app SDK v2)
    ├── blockmaster.service       systemd unit (calls app_data/run.sh)
    ├── app_data/                 docker-compose.yml, images.env, run.sh, image tarballs (from package-mynode.sh)
    ├── scripts/                  install / pre / post / uninstall hooks
    ├── nginx/                    https on 4091 incl. WebSocket
    └── www/                      app page for the myNode UI
```
