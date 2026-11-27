# Files

Every file in the repository, where it lives, and what it is for.

## Root

| File | Purpose |
| ---- | ------- |
| `package.json` | Project metadata (`vib-mcp-client@1.0.0`, ESM, MIT). Scripts: `dev` (tsx), `typecheck` (tsc --noEmit), `build` (node build.mjs). Runtime dep: `@modelcontextprotocol/sdk`. Dev deps: typescript, esbuild, tsx, @types/node. |
| `package-lock.json` | npm lockfile v3; exact dependency resolutions and integrity metadata. |
| `tsconfig.json` | TypeScript config for `npm run typecheck`. |
| `build.mjs` | esbuild bundler producing `dist/.vib-mcp/vib-mcp.mjs` and copying config templates. |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `.env`, `.vib-mcp/.env`, `*.log`, `.DS_Store`. |
| `README.md` | Public-facing readme: features, quick start, CLI reference, security. |
| `AGENTS.md` | Agent rules: mandatory reads (`project/MISSION.md`, `SPEC.md`, `RELEASE.md`), module ownership, typecheck requirement, release governance, end-user AGENTS.md snippet, and documentation-folder rules (`notes/`, `project/`, `docs/`). |

## `src/` — TypeScript source

| File | Purpose |
| ---- | ------- |
| `src/types.ts` | Shared type definitions only (see `modules.md`). |
| `src/config.ts` | Config/env/secrets: path resolution, `servers.json` read/write/validation, `.env` parsing, `${VAR}` interpolation, `maskSecrets`. |
| `src/client.ts` | MCP SDK layer: transport creation, connect+timeout wrapper, ping/list/describe/call, output truncation. |
| `src/cli.ts` | Entry point: arg parsing, command dispatch, output formatting, exit codes. |

## `templates/` — portable config templates

| File | Purpose |
| ---- | ------- |
| `templates/servers.json` | Example server definitions copied into `dist/` and `release/` artifacts. |
| `templates/.env.example` | Placeholder env template; copied as `.env.example` (never a populated `.env`). |

## `dist/` — build output (gitignored)

| Path | Purpose |
| ---- | ------- |
| `dist/.vib-mcp/vib-mcp.mjs` | Self-contained portable bundle produced by `npm run build`. |
| `dist/.vib-mcp/servers.json` | Copy of `templates/servers.json`. |
| `dist/.vib-mcp/.env.example` | Copy of `templates/.env.example`. |

## `release/` — versioned artifacts (governed by `project/RELEASE.md`)

Does not exist yet. When authorized, each `release/vX.Y.Z/.vib-mcp/` contains
only `vib-mcp.mjs`, `servers.json`, `.env.example`. Agents must not create or
modify it without explicit user instruction after the forensic audit.

## `project/` — development documentation (see `project/MANIFEST.md`)

| Path | Purpose |
| ---- | ------- |
| `project/BASELINE.md` | Immutable audited source inventory and resume contract. |
| `project/FORENSIC-FINDINGS.md` | Static findings and outstanding verification gates. |
| `project/MISSION.md` | Mission, boundaries, workflow, guardrails. |
| `project/SPEC.md` | Locked user-facing contract. |
| `project/RELEASE.md` | Release governance. |
| `project/blueprint/` | Internal architecture map (this folder's docs). |
| `project/README.md`, `project/MANIFEST.md` | Folder guide and index. |

## `notes/` — dev-time notes (see `notes/MANIFEST.md`)

Scratch planning and phase logs written before/during changes. Initial freeze note: [BASELINE-01](../../notes/2026-11-27-baseline-01.md). See the folder manifest for individual notes.

## `docs/` — end-user documentation (see `docs/MANIFEST.md`)

A-Z user guides: how to install, configure, and use every command.
