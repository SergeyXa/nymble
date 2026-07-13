# Docker deployment and configuration

Nymble is built from the current working tree and deployed as a local Docker
image. In this guide, `<working-tree>` means `~/code/nymble` or any directory
where you cloned the repository; `<runtime-dir>` defaults to `/srv/nymble`.

```text
working tree                  runtime directory
------------------------------------------------------
<working-tree>           ->   <runtime-dir>
  Dockerfile                docker-compose.yml
  docker-compose.yml        .env
  ops/deploy.sh             data/dictionaries.json
```

The Docker daemon is shared by both directories. `ops/deploy.sh` builds a
versioned `nymble:<commit>-<timestamp>` image from the working tree, writes
that tag to the runtime `.env`, starts Compose from the runtime directory,
verifies the health endpoint, and deletes every older `nymble:*` image. It
does not delete `data/`, Presidio, or images belonging to other projects.

The Docker build writes `dist/` only inside its build stage. Host `dist/` is
excluded through `.dockerignore`, so a privileged deployment never leaves
root-owned build files in the working tree.

## Deployment

Deploy from the working tree:

```bash
cd ~/code/nymble
sudo npm run deploy
```

The first deployment creates `/srv/nymble/.env` from
`ops/runtime.env.example`. It is mode `0600` and persists across deployments.
The deploy script persists the deployment name and updates
`NYMBLE_IMAGE_TAG` on every deployment. It also persists `NYMBLE_HOST_PORT`
when that value is supplied for deployment; edit the other values in that file
when needed.

On its first deployment, Nymble copies the tracked example dictionary from
`<working-tree>/data/dictionaries.json` to
`<runtime-dir>/data/dictionaries.json`. Later deployments never overwrite the
runtime dictionary. Replace the example with your own entries in the web UI or
by editing the runtime file before deployment.

## Configuration map

| What to choose | Where to configure it | Default | Notes |
| --- | --- | --- | --- |
| Source/working-tree path | Location of the cloned repository | `~/code/nymble` | `ops/deploy.sh` derives the source path from its own location. Clone the repository anywhere convenient. |
| Runtime directory | `NYMBLE_DEPLOY_DIR` when starting deploy | `/srv/nymble` | This directory receives Compose, `.env`, and persistent `data/`. Example: `sudo env NYMBLE_DEPLOY_DIR=/opt/nymble npm run deploy`. |
| Deployment name | `NYMBLE_DEPLOY_NAME` when starting deploy, then `<runtime directory>/.env` | `nymble` | Docker Compose project name and Nymble image repository. Use a distinct lowercase name for a parallel instance; cleanup then affects only that instance's images. |
| Dictionary data path | `<runtime directory>/data` | `/srv/nymble/data` | It is bind-mounted into the container as `/app/data`. Choosing a different runtime directory also moves this data path. |
| Nymble host port | `NYMBLE_HOST_PORT` in `<runtime directory>/.env` or when starting deploy | `3100` | Each parallel instance needs a unique host port. The host binding remains `127.0.0.1`; keep it behind a reverse proxy. |
| Nymble internal port | `docker-compose.yml`, `nymble.environment.PORT` and `nymble.ports` target | `3100` | Keep these two values aligned. |
| Container data path | `docker-compose.yml`, volume target and `DICTIONARY_PATH` | `/app/data/dictionaries.json` | Change both together if the container filesystem layout changes. |
| Presidio image/version | `docker-compose.yml`, `presidio-analyzer.image` | `ghcr.io/data-privacy-stack/presidio-analyzer:latest` | Pin a version or digest when reproducibility is more important than automatic updates. |
| Presidio memory cap | `docker-compose.yml`, `presidio-analyzer.mem_limit` | `1200m` | The current VPS sizing was tested with this cap. |
| Presidio public port | `docker-compose.yml` | none | Do not add `ports` unless there is a specific administrative need. `expose: 3000` is internal-only. |
| Nymble image name | `NYMBLE_DEPLOY_NAME` when starting deploy | `nymble` | This is also the Docker Compose project name and the repository whose old images are removed. |
| Nymble image tag | `<runtime directory>/.env`, managed by deploy | generated from Git SHA and UTC timestamp | Override before deployment with `NYMBLE_IMAGE_TAG=nymble:my-tag`; normally leave it to the script. |
| Restart policy | `docker-compose.yml`, each service's `restart` | `unless-stopped` | Change to `always` or `no` only if that matches the host's operational policy. |

## Leak detection configuration

These values live in the runtime `.env` and are injected into the Nymble
container on every Compose start:

```env
LEAK_DETECTION_ENABLED=true
LEAK_DETECTION_PROVIDER=presidio
PRESIDIO_DEFAULT_LANGUAGE=en
PRESIDIO_SUPPORTED_LANGUAGES=en
PRESIDIO_SCORE_THRESHOLD=0.5
```

`PRESIDIO_ANALYZER_URL` is deliberately fixed in `docker-compose.yml` as
`http://presidio-analyzer:3000`. This prevents an accidental configuration
from sending sensitive text outside the internal Compose network. The language
dropdown shows only values listed in `PRESIDIO_SUPPORTED_LANGUAGES`; add a
language there only after the Presidio image has been configured to support it.

Use `LEAK_DETECTION_ENABLED=false` to disable calls for every user. The UI also
has an `off` option for a single transform; it does not change the runtime
configuration.

## Parallel test deployment

Use a distinct deployment name, runtime directory, and host port. For example,
the following creates an independent test instance without changing the main
`nymble` deployment:

```bash
cd ~/code/nymble
sudo env \
  NYMBLE_DEPLOY_NAME=nymble-test \
  NYMBLE_DEPLOY_DIR=/srv/nymble-test \
  NYMBLE_HOST_PORT=3200 \
  npm run deploy
```

This creates Compose resources named `nymble-test-*`, stores test dictionaries
under `/srv/nymble-test/data`, uses `http://127.0.0.1:3200`, and removes only
old `nymble-test:*` application images on later test deployments. It starts a
second Presidio Analyzer container, so allow for its additional memory use.

## Verification and troubleshooting

After deployment:

```bash
sudo docker compose \
  --project-name nymble \
  --env-file /srv/nymble/.env \
  -f /srv/nymble/docker-compose.yml \
  ps

curl http://127.0.0.1:3100/api/health
curl http://127.0.0.1:3100/api/config
```

Follow both service logs:

```bash
sudo docker compose \
  --project-name nymble \
  --env-file /srv/nymble/.env \
  -f /srv/nymble/docker-compose.yml \
  logs -f
```

Do not edit `<runtime directory>/docker-compose.yml` for lasting changes:
every deploy copies it from the working tree. Edit the tracked
`<working-tree>/docker-compose.yml` instead. In contrast, changes to
`<runtime directory>/.env` and `<runtime directory>/data/` are preserved by
deployment.
