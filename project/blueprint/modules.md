# Modules

`vib-mcp-client` is a small TypeScript CLI. Source lives in `src/`; the build
bundles it into one portable `.mjs` file.

## `src/types.ts` — shared types (34 lines)

**Responsibility:** Type-only module. Defines every interface/type used across
the codebase. No runtime code, no imports from other project modules.

**Exports:**

| Type | Purpose |
| ---- | ------- |
| `HttpServerConfig` | Remote server: `type: "http" \| "sse"`, `url`, optional `headers`, optional `timeout`. |
| `StdioServerConfig` | Local server: `type: "stdio"`, `command`, optional `args`, `env`, `timeout`. |
| `ServerConfig` | Union of the two above. |
| `ServersFile` | Shape of `servers.json`: `{ servers: Record<string, ServerConfig> }`. |
| `GlobalOptions` | Parsed CLI flags: `json`, `maxChars`, `timeout`, `configPath?`. |
| `ResolvedConfig` | Fully loaded config: `configPath`, `envPath`, interpolated `servers`, collected `secrets`. |

**Used by:** `config.ts`, `client.ts`, `cli.ts` (type imports only).

## `src/config.ts` — configuration, env, secrets (358 lines)

**Responsibility:** Everything about reading, validating, writing, and
resolving configuration and secrets. It is the only module that touches
`servers.json` and `.env` files.

**Key functions:**

| Function | What it does |
| -------- | ------------ |
| `resolveConfigPaths(custom?)` | Picks `servers.json` path: `--config` value, else `servers.json` beside the script, else `./.vib-mcp/servers.json` under cwd. Also derives sibling `.env` path. |
| `loadServerDefinitions(custom?)` | Reads + validates `servers.json` without env interpolation (used by `servers`, `list`, etc. for existence checks). |
| `parseEnvFile(envPath)` | Parses `.env`: skips blanks/comments, supports `KEY=value`, single/double quotes, inline ` #` comments, BOM. |
| `interpolateEnv(value, envMap, secrets)` | Replaces `${VAR}` from `.env` then `process.env`; throws on missing vars; records resolved values into `collectedSecrets`. |
| `loadConfig(custom?, serverName?)` | Full pipeline: resolve paths → read file → parse env → interpolate headers/env for all (or one) server → return `ResolvedConfig` with secret list. |
| `saveServer(name, config, custom?)` | Validates and upserts a server into `servers.json` (used by `add`). |
| `removeServer(name, custom?)` | Removes a server; returns `false` if absent (used by `remove`). |
| `maskSecrets(text, secrets)` | Replaces every known secret (length ≥ 4, longest first) with `***REDACTED***`. |

**Internal helpers:** `isRecord`, `isStringRecord`, `validateTimeout`,
`validateServerConfig`, `parseServersFile`, `readServersFile`,
`writeServersFile`.

**Used by:** `cli.ts` (all config needs), `client.ts` (`maskSecrets` only).

## `src/client.ts` — MCP protocol operations (202 lines)

**Responsibility:** All MCP SDK interaction. Creates transports, connects a
`Client`, runs `ping`/`listTools`/`callTool`, applies timeouts, and masks
secrets in errors.

**Key functions:**

| Function | What it does |
| -------- | ------------ |
| `createTransport(serverConfig)` | Maps config type to SDK transport: `stdio` → `StdioClientTransport` (env merged over `process.env`), `http` → `StreamableHTTPClientTransport`, `sse` → `SSEClientTransport`. Headers passed via `requestInit`. |
| `withMcpClient(config, timeoutMs, secrets, fn)` | Connects a `Client` (`vib-mcp-client@1.0.0`), runs `fn` under `withTimeout` (per-server `timeout` overrides global), masks secrets in thrown errors, always closes client/transport. |
| `pingServer(...)` | Health check: tries `client.ping`, falls back to `listTools` on `-32601` method-not-found; returns `{ ok, latencyMs, serverInfo }`. |
| `listServerTools(...)` | Returns `[{ name, description }]` for each tool. |
| `describeServerTool(...)` | Finds one tool by name in `listTools` result; returns the full tool object (schema included); throws if absent. |
| `callServerTool(...)` | `client.callTool({ name, arguments })` under timeout. |
| `truncateText(text, maxChars)` | Caps output at `maxChars` with a `... [truncated: ...]` notice; `maxChars <= 0` disables. |

**Internal helpers:** `withTimeout`, `errorMessage`, `isMethodNotFound`.

**Used by:** `cli.ts` only.

## `src/cli.ts` — command-line interface (582 lines)

**Responsibility:** `process.argv` parsing, command dispatch, output
formatting (text/`--json`), secret masking of all output, and exit codes.
Entry point of the bundle.

**Key functions:**

| Function | What it does |
| -------- | ------------ |
| `parseGlobalArguments(args)` | Extracts `--json`, `--max-chars`/`=` , `--timeout`/`=`, `--config`/`=`; rest become positionals. |
| `parseAddArguments(args)` | Parses `add` flags `--type http\|sse` (default `http`) and `--token-env VAR` (validated env-var name). |
| `configuredSecrets(config)` | Union of interpolated secrets + all literal header/env values for masking. |
| `safeTarget(server)` | Renders a safe endpoint string: stdio → command; remote → URL with credentials stripped and token-like query params redacted. |
| `writeJson` / `writeError` | JSON output to stdout/stderr with secrets masked. |
| `loadConfigured` / `getServer` | Load interpolated config; resolve a named server or throw with available names. |
| `extractToolText(result)` | Pulls text blocks from MCP result `content`, falls back to `structuredContent`/raw JSON. |
| `runCommand(command, args, context)` | Dispatch for `servers`, `add`, `remove`, `list`, `describe`, `call`, `ping`. |
| `main()` | Handles `-h/--help`, `-v/--version`, parses globals, runs command, maps `UsageError` → exit 2, other errors → exit 1. |

**Constants:** `VERSION = "1.0.0"`, `DEFAULT_MAX_CHARS = 8000`,
`DEFAULT_TIMEOUT_MS = 30000`, `HELP_TEXT`.

**Classes:** `UsageError` (marks exit-code-2 errors).

## `build.mjs` — bundler (62 lines)

**Responsibility:** esbuild script run by `npm run build`. Bundles
`src/cli.ts` + `@modelcontextprotocol/sdk` into `dist/.vib-mcp/vib-mcp.mjs`
(ESM, node20, unminified, `write:false` then manual write). If output contains
CJS `require`/`__require` artifacts, rebuilds once with a `createRequire`
banner. Normalizes shebang to a single `#!/usr/bin/env node`. Copies
`templates/servers.json` and `templates/.env.example` into `dist/.vib-mcp/`.
Never touches `release/`.

## `templates/`

- `templates/servers.json` — starter config: `private-vps` (http + Bearer
  `${VPS_MCP_TOKEN}`), `public` (http, no auth), `local-files` (stdio npx
  filesystem server).
- `templates/.env.example` — placeholder env template (30 bytes).

## Dependency map

```
cli.ts ──imports──> client.ts, config.ts, types.ts
client.ts ──imports──> config.ts (maskSecrets), types.ts, @modelcontextprotocol/sdk
config.ts ──imports──> types.ts, node builtins only
build.mjs ──bundles──> src/cli.ts (+ sdk) → dist/.vib-mcp/vib-mcp.mjs
```
