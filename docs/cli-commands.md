# CLI Commands Reference

Verified against `src/cli.ts` and `project/SPEC.md` on 2026-11-27 (SEC-01 candidate static review; see project evidence for runtime acceptance).

Invoke the portable client as:

```sh
node .vib-mcp/vib-mcp.mjs [global options] <command> [arguments]
```

Version: `1.0.0`. Requirements: Node.js 20+.

## Global options

| Flag | Default | Behavior |
| ---- | ------- | -------- |
| `--json` | off | Emit machine-readable JSON to stdout (errors as JSON to stderr). |
| `--max-chars <n>` | `8000` | Cap large output; `0` disables truncation. Truncated output ends with `... [truncated: showing N of M chars. Use --max-chars <n> to adjust]`. Also accepts `--max-chars=<n>`. |
| `--timeout <ms>` | `30000` | Abort MCP requests exceeding this. Per-server `timeout` in `servers.json` overrides it. Also accepts `--timeout=<ms>`. |
| `--config <path>` | `.vib-mcp/servers.json` | Custom `servers.json` path. Resolution order without it: `servers.json` beside the running script first, then `./.vib-mcp/servers.json` under the cwd. Also accepts `--config=<path>`. |
| `-h`, `--help` | — | Print help, exit 0. |
| `-v`, `--version` | — | Print `1.0.0`, exit 0. |

`--max-chars` and `--timeout` require positive integers (`--max-chars` allows
0). Missing or invalid values are usage errors (exit 2).

## Commands

### `servers`

Lists configured servers. No arguments or options allowed.

- Text: one line per server — `name [type] target (auth: true|false)`.
- `target` is the command for `stdio`, or the URL for remote servers with
  credentials stripped and token-like query params replaced by
  `***REDACTED***`.
- `--json`: array of `{ name, type, target, auth }`.
- Empty config prints `No servers configured.`

Uses local server definitions; no MCP connection. Known credential context is collected from sibling `.env` and configured references before validation.

### `add <name> <url> [--type http|sse] [--token-env VAR_NAME]`

Adds or updates a **remote** server in `servers.json`.

- `--type` defaults to `http`; `sse` selects the legacy SSE transport.
- URL must be absolute `http:` or `https:`.
- `--token-env` must match `^[A-Za-z_][A-Za-z0-9_]*$`. It stores
  `headers.Authorization = "Bearer ${VAR_NAME}"` — the env var **name**, never
  a token value. Prints a reminder to add the variable to `.vib-mcp/.env`.
- Without `--token-env`, no headers are stored (no-auth server).
- `--json` output: `{ ok, name, type, configPath, tokenEnv?, reminder? }`.
- Creates parent directories of the config file if needed; preserves other
  servers and writes pretty-printed JSON.

### `remove <name>`

Removes a server definition. Fails (exit 1) if the server does not exist.
`--json` output: `{ ok: true, removed: name }`.

### `list <server>`

Lists a server's tools: name + short description per line. Connects to the
server. `--json` outputs the array of `{ name, description }`. Prints
`No tools available.` when empty.

### `describe <server> <tool>`

Prints the full JSON tool object (name, description, inputSchema) for one
tool. Fails with `Tool "<tool>" not found on server.` if absent. Output is
pretty-printed JSON regardless of `--json`.

### `call <server> <tool> [json_args]`

Executes a tool.

- `json_args` must be a single JSON **object** argument; omit for no args.
- Text output: extracted text content blocks joined by newlines; falls back to
  `structuredContent` or raw JSON when no text blocks exist.
- `--json` output: `{ output, truncated, originalLength }`.
- If the tool result has `isError`, the text goes to **stderr** and the exit
  code is **1** (`--json` emits `{ error, truncated, originalLength }` to
  stderr).
- Output is truncated per `--max-chars`.

### `ping <server>`

Health check. Text: `OK <server> (<latency> ms)[ - <server name> <version>]`.
`--json`: `{ server, ok, latencyMs, serverInfo }`.

Internally tries `client.ping` first; if the server returns JSON-RPC `-32601`
(method not found), it falls back to `listTools`.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | Success. |
| `1` | Runtime or connection error (bad server name, unreachable server, tool error, missing env var, etc.). |
| `2` | Invalid CLI usage (`UsageError`): unknown command/option, wrong arity, bad flag values, invalid JSON args. |

## Security notes

- Known configured credentials, including short values and supported encoded variants, are masked. JSON values and dynamic keys are sanitized before serialization; fixed contract keys and primitive types are preserved. Key collisions fail closed.
- Tool output is sanitized before truncation. Unknown remote secrets or credentials embedded in arbitrary arguments cannot be inferred reliably; do not put secrets in command arguments or arbitrary URL paths.
- Stdio child stderr is suppressed so raw diagnostics cannot bypass the CLI output boundary.
- `add --token-env` stores only the variable name.
