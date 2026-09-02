# Photon CLI

Source: /docs/cli/overview, installation, authentication, projects, spectrum, billing, profile-and-utilities

Install: `npm install -g @photon-ai/cli` (or pnpm, yarn, bun; one off via `npx @photon-ai/cli`; standalone binaries at github.com/photon-hq/cli releases for darwin and linux, arm64 and x64). Needs Node.js 18 or later. A `pho` alias is created on first global run. `photon ping` hits the API health endpoint. Suppress the update notice with `PHOTON_NO_UPDATE_NOTIFIER=1`.

## Command tree

```text
photon
├── ping | env current | login [--no-browser] | logout | whoami
├── auth status [--json]        login state across all backends
├── config show [--json]
├── profile show | init | update [flags]
├── projects
│   ├── ls | show [id] | create [--name --location --spectrum]
│   ├── update [id] | delete [id] [-y]
│   ├── regenerate-secret [id] [-y]     rotate the Spectrum API secret (old one dies immediately)
│   ├── open [id] | check-phone <number>
│   └── upgrade [id] [tier] [--checkout|--manage|--plan price_xxx --qty n]
├── spectrum
│   ├── profile show | update --display-name "..."
│   ├── users ls [--json] | add | remove <user-id>
│   ├── lines ls | add | remove <line-id>          (add: iMessage lines only)
│   ├── platforms ls | enable <name> | disable <name>
│   └── avatar upload <file> [--no-update-profile]
└── billing plans | show [--json] | checkout [tier] [--plan --qty] | manage
```

## Authentication

`photon login` runs a device authorization flow (browser approval, `--no-browser` prints the URL). Credentials are JSON files with 600 permissions under `$PHOTON_CONFIG_DIR/credentials/<backend-key>.json` (resolution: `$PHOTON_CONFIG_DIR`, then `$XDG_CONFIG_HOME/photon`, then `~/.config/photon/`), stored per backend so production and staging logins coexist. Backend host resolution: `--api-host` flag, then `PHOTON_API_HOST`, then production `https://app.photon.codes`. CI: pass the device flow access token (7 day expiry, long lived API keys on the roadmap) via `-t/--token` or `PHOTON_TOKEN`, pair with `--json`.

## Active project

Most spectrum and billing commands need a project: `--project <id>` or `export PHOTON_PROJECT_ID=<id>`. Flag beats env var; neither set is an error with a hint.

## Spectrum commands

- `photon spectrum profile show|update`: the Spectrum profile attached to the project (display name and so on).
- `photon spectrum users ls|add|remove`: the users allowed to interact through the project's Spectrum instance. Removing is irreversible; `-y` skips confirmation.
- `photon spectrum lines ls|add|remove`: phone lines assigned to the project. `lines ls` lists dedicated lines (empty on shared Free and Pro plans). `lines add` currently supports iMessage lines only (Business).
- `photon spectrum platforms ls|enable|disable`: view and toggle messaging platforms for the project. `platforms ls` shows each platform's enabled state and whether it is actually connected; the webhook troubleshooting flow uses it to spot a platform that is enabled but not connected (an unpaired iMessage line, an expired WhatsApp token), which yields zero inbound events.
- `photon spectrum avatar upload photo.png`: presigned upload plus profile patch; `--no-update-profile` uploads only.

## Projects and billing

`photon projects upgrade` smart routes: Free or unsubscribed opens Stripe Checkout, active or past due opens the Stripe Customer Portal (`--checkout` and `--manage` force a flow, `--manage` wins). Tiers: `pro`, `business`, `enterprise`. `photon billing plans|show|checkout|manage` are the project scoped billing equivalents. Downgrades and cancellations happen in the Stripe Portal.

## Common flags

`-p/--project` (`PHOTON_PROJECT_ID`), `--api-host` (`PHOTON_API_HOST`), `-t/--token` (`PHOTON_TOKEN`), `--json`, `-y/--yes`, `--no-browser`. Global: `--debug` (`PHOTON_DEBUG=1`), `--version`, `--no-color` (`NO_COLOR=1`).
