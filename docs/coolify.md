# Deploy Bode Secret Share on Coolify

Use the repository's [Coolify Compose file](../docker-compose.coolify.yml).
It builds the Go server and website and starts a dedicated Memcached instance.
Rust is not needed. Coolify's proxy handles public HTTPS; neither container
publishes a host port.

## Prerequisites

- A working Coolify server with its proxy enabled and ports 80/443 reachable.
- A Git repository containing this distribution, accessible to Coolify.
- An A record for `secret.bode.one` pointing to the Coolify server. Only add an
  AAAA record if the server is also reachable over IPv6.
- Enough memory for the Go/Node image build and the running services. Memcached
   defaults to a 64 MB cache inside a 128 MB container limit. The previous
   Dragonfly configuration used a 512 MB data limit. These are configured limits,
   not idle RAM measurements; the app, proxy and image builds need extra memory.

## Create the Application

1. In your Coolify project/environment, add a new application from the Git
   repository. Choose the branch containing this distribution.
2. Select the **Docker Compose** build pack (called **Compose** under
   **Build strategy** in some versions).
3. Set **Base Directory** to `/` and **Docker Compose Location** to
   `/docker-compose.coolify.yml`. The build context must remain the repository
   root, where the Dockerfile and Go module are located.
4. Save and load/reload the Compose definition. Use normal Coolify-managed
   deployment, not **Raw / deploy file as-is**. Leave custom build/start commands
   empty; Coolify must generate its proxy labels and networks.
5. In **Environment Variables**, review the following runtime values:

| Variable | Value |
| --- | --- |
| `PUBLIC_URL` | `https://secret.bode.one` (no trailing slash or `:1337`) |
| `MEMCACHED_MEMORY_MB` | `64` by default, in whole megabytes; increase for additional cache capacity. |
| `MEMCACHED_CONTAINER_MEMORY` | `128m` by default; keep above cache size to allow process overhead. |
| `LICENSE_KEY` | Optional upstream license for other business features; not required for Bode receipts. Mark as a runtime secret, not a build variable. |

Memcached has no application password in this setup. Its security boundary is
the private, internal `storage` network shared only with Secret Share. Never
publish its port, assign it a domain or attach untrusted containers to that
network. UDP is disabled. Do not commit license keys or paste the resolved
Compose definition into tickets.

6. Under **Domains**, assign `https://secret.bode.one:1337` to the
   **secret-share** service. The `:1337` tells Coolify which internal HTTP port
   receives traffic; visitors still use `https://secret.bode.one` on port 443.
   Do not assign a domain or public port to **memcached**.
7. Leave **Connect to predefined network** disabled. The services already share
   a private `storage` network; only the app needs the Coolify proxy connection.
   Do not add host port mappings for 1337 or 11211.
8. Deploy. Wait until both services are healthy, then open
   `https://secret.bode.one`. Coolify obtains/manages the TLS certificate; do not
   configure a TLS certificate inside the Go container.

The Go container serves both the API and website. Do not select Nixpacks, deploy
the historical Rust server, or use the local `insecure/colima.yml` override here.
For UI differences, see the [official Coolify Compose documentation](https://coolify.io/docs/applications/build-packs/docker-compose).

## Verify the Deployment

```sh
curl --fail https://secret.bode.one/health
curl --fail https://secret.bode.one/config
```

The health endpoint must return `{"status":"healthy"}`. Confirm that config
contains `PUBLIC_URL=https://secret.bode.one`, `DEFAULT_EXPIRY=10800`,
`FORCE_ONETIME_SECRETS=true` and `ALLOW_CUSTOM_EXPIRATION=false`.

Create two text links and two file links in the browser. Confirm each has its
own key, each opens once and consuming one does not consume another. Repeat with
**Three Hours**, **One Day** and **One Week**. Never use real sensitive data for
deployment checks.

## Read Receipts

Receipts are included in both text and file forms, the generated-link result
page and the **Receipts** navigation page. Bode receipts do not require a
license. Redeploy **secret-share** with the current Go server to enable them.

The Compose file sets `DISABLE_READ_RECEIPTS=false` and
`DEFAULT_READ_RECEIPT=true`. On a writable instance, `/config` must report
`READ_RECEIPTS=true` and `DEFAULT_READ_RECEIPT=true`; the read-receipt checkbox
is then selected by default. Set `DISABLE_READ_RECEIPTS=true` to hide the
creation option and reject new receipts. `DISABLE_FEATURES` only hides the
upstream promotional section; it does not disable receipts.

Each link in a batch receives its own receipt. Only the receipt token and
metadata are saved in the sender's browser, never the secret link or decryption
key. Open **Receipts** in that same browser to check pending/opened status.
A receipt records server retrieval, not proof that the recipient read or saved
the content. Its server record expires with the chosen secret lifetime and is
also lost if Memcached restarts. See [Read Receipts](read-receipts.md).

If the domain returns **No Available Server**, check the runtime logs and
container health, confirm the domain targets **secret-share** on internal port
1337, and verify DNS/TLS. If storage is unavailable, confirm Memcached is healthy,
both services share `storage`, and the app uses `DATABASE=memcached` and
`MEMCACHED=memcached:11211`.

## Migrating from Dragonfly

This changes storage backends, not just the container image. Existing links and
server-side receipts in Dragonfly do not migrate and will no longer work.
Plan the switch after outstanding links have expired, or notify senders that
they must generate new links. Do not copy or restore consumed records.

1. Load the updated Compose definition in Coolify. Confirm the storage service
   is **memcached**, with no domain or published port.
2. Remove the unused `SERVICE_PASSWORD_DRAGONFLY` and `DRAGONFLY_MAXMEMORY`
   variables. Keep `PUBLIC_URL` and any `LICENSE_KEY`. Review the two new
   Memcached memory variables above.
3. Redeploy and confirm both new services are healthy. If Coolify keeps the old
   Dragonfly container as an orphan, stop/remove that resource after verifying
   the switch; otherwise it will keep using RAM. Do not remove unrelated services.
4. Repeat the two-link text and file checks above, including the Receipts page
   without needing a license. The three expiration choices and one-time behavior are unchanged.

## Storage and Updates

Memcached stores encrypted text, files and receipt metadata in memory, without
persistent volumes or backups. Restarting/recreating
Memcached, redeploying it or rebooting the host loses all outstanding links,
even when their selected expiration has not elapsed. An app-only restart does
not consume or erase records that remain in Memcached.

Do not restore old database backups: they could reintroduce already-consumed
one-time links. Recipients can still save or copy plaintext after decryption;
one-time access only limits retrieval from the server.

The three TTLs are 10,800, 86,400 and 604,800 seconds. Under memory pressure,
creation can fail. The `-M` option disables eviction: a full cache refuses new
writes instead of evicting existing links. Monitor memory and write failures,
and leave host headroom. `MEMCACHED_MEMORY_MB` controls item-cache capacity, not
the entire process; `MEMCACHED_CONTAINER_MEMORY` is the hard container limit.
Exceeding that hard limit can restart the container and lose all records.
If increasing cache size, increase the container limit too (for example,
`128` and `192m`). The per-item limit is 2 MB; the app's default upload limit
remains 512 KB and encrypted/base64 data has additional overhead. Larger licensed
uploads need a suitable external file store or coordinated item/cache limits.

Keep Memcached's image version pinned and test upgrades before production. An
upgrade that recreates Memcached invalidates outstanding links with this
in-memory configuration. Git auto-deployments should therefore be deliberate.