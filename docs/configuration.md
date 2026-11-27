# Configuration Reference

Verified against `src/config.ts`, `src/types.ts`, `project/SPEC.md`, and
`templates/` on 2026-11-26.

## Portable layout

A dropped-in project contains:

```text
project-root/
└── .vib-mcp/
    ├── vib-mcp.mjs      # bundled CLI (from npm run build)
    ├── servers.json     # server definitions
    └── .env             # secrets (gitignored, never committed)
```

The bundle is self-contained (no `node_modules/` needed) and requires
Node.js 20+.

## `servers.json`

Top-level shape: `{ "servers": { "<name>": <config> } }`. Each server has
exactly one `type`.

### `http` — Streamable HTTP (recommended remote)

```json
{
  "type": "http",
  "url": "https://mcp.example.com/mcp",
  "headers": { "Authorization": "Bearer ${VPS_MCP_TOKEN}" }
}
```

- Required: `url` (non-empty string).
- Optional: `headers` (string→string map), `timeout` (positive number, ms;
  overrides global `--timeout` for this server).
- Uses `StreamableHTTPClientTransport`; headers go into `requestInit`.

### `sse` — legacy Server-Sent Events

Same fields as `http`; uses `SSEClientTransport`. Choose only for servers
that require the legacy SSE transport.

### `stdio` — local process

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["./mcp-server.mjs"],
  "env": { "NODE_ENV": "production" }
}
```

- Required: `command` (non-empty string).
- Optional: `args` (string array), `env` (string→string map), `timeout`.
- Uses `StdioClientTransport`. `env` values may contain `${VAR}` interpolations. At spawn time only the SDK platform default environment plus explicitly configured `env` values are forwarded; explicit values win. Windows keys are normalized case-insensitively. Raw child stderr is suppressed.
- Explicitly configure any additional variables the trusted child requires. This reduces environment exposure but is not an OS sandbox; only run trusted stdio commands/configurations.

### `${VAR}` interpolation

Any string inside `headers` (remote) or `env` (stdio) may reference
`${ENV_VAR}`. Resolution order: values from the sibling `.env` file first,
then `process.env`. Missing or empty variables throw:

```
Missing required environment variable: <NAME>. Add it to .vib-mcp/.env or set it in the process environment.
```

## `.env` file

- Lives next to `servers.json` (i.e. `.vib-mcp/.env`).
- Parsed line-by-line: `KEY=value`; blank lines and `#` comments skipped;
  `KEY` must be non-empty; surrounding whitespace trimmed.
- Values may be single- or double-quoted (quotes stripped; `\"`, `\\`, `\'`
  escapes honored inside double processing). Unquoted values may have an
  inline ` # comment` stripped.
- A UTF-8 BOM is tolerated.
- Missing file is fine — all variables then come from `process.env`.
- **Never commit it.** `.gitignore` already covers `.env` and
  `.vib-mcp/.env`; ensure target projects do too.

## Config path resolution

Without `--config`:

1. If `servers.json` exists beside the running `vib-mcp.mjs` script, use it.
2. Otherwise use `./.vib-mcp/servers.json` relative to the current working
   directory.

`.env` is always looked up as a sibling of the resolved `servers.json`.
`--config <path>` overrides `servers.json` (resolved against cwd); `.env`
still resolves next to it.

## Validation rules (config load fails → exit 1)

- File must be valid JSON with a top-level `servers` object.
- Server names must be non-empty.
- `type` must be `http`, `sse`, or `stdio`.
- `http`/`sse`: `url` non-empty string; `headers` string→string if present.
- `stdio`: `command` non-empty string; `args` string array; `env`
  string→string.
- `timeout` (any type): positive finite number if present.

## Templates

`templates/servers.json` ships three examples:

- `private-vps` — http + `Authorization: Bearer ${VPS_MCP_TOKEN}`.
- `public` — http, no auth.
- `local-files` — stdio `npx -y @modelcontextprotocol/server-filesystem .`.

`templates/.env.example` is copied into builds as `.env.example` — a
placeholder template only; real values never ship.
