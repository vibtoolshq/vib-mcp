# Functions

Function-level map: what each function does, where it is defined, and where it
is called. Verified against `src/` on 2026-11-26.

## `src/types.ts`

Type-only module — no functions.

## `src/config.ts`

| Function | Defined | Called by | Purpose |
| -------- | ------- | --------- | ------- |
| `isRecord` | config.ts:17 | `isStringRecord`, `validateServerConfig`, `parseServersFile`, `parseEnvFile` consumers | Type guard: non-null, non-array object. |
| `isStringRecord` | config.ts:21 | `validateServerConfig` | Type guard: object whose values are all strings (for `headers`/`env`). |
| `validateTimeout` | config.ts:28 | `validateServerConfig` | Optional per-server `timeout` must be a positive finite number. |
| `validateServerConfig` | config.ts:47 | `parseServersFile`, `saveServer` | Validates one server entry by `type`; returns typed `ServerConfig`. |
| `parseServersFile` | config.ts:99 | `readServersFile` | `JSON.parse` + structural validation of whole file. |
| `readServersFile` | config.ts:125 | `loadServerDefinitions`, `loadConfig`, `saveServer`, `removeServer` | Reads file → `parseServersFile`; ENOENT → friendly error. |
| `writeServersFile` | config.ts:139 | `saveServer`, `removeServer` | Writes `{ servers }` as pretty JSON, creating parent dir. |
| `resolveConfigPaths` | config.ts:148 | `loadServerDefinitions`, `loadConfig`, `saveServer`, `removeServer` | Resolves `configPath` (`--config` > script-adjacent > `./.vib-mcp/`) and sibling `envPath`. |
| `loadServerDefinitions` | config.ts:172 | `cli.ts` (`servers`, `list`, `describe`, `call`, `ping`) | Un-interpolated read for existence checks and `servers` listing. |
| `parseEnvFile` | config.ts:180 | `loadConfig` | Parses `.env` into key/value map; missing file → `{}`. |
| `interpolateEnv` | config.ts:234 | `loadConfig` | `${VAR}` substitution from envMap then `process.env`; throws on missing; collects secret values. |
| `loadConfig` | config.ts:255 | `cli.ts` `loadConfigured` | Full config pipeline → `ResolvedConfig` (paths, interpolated servers, secrets). |
| `saveServer` | config.ts:310 | `cli.ts` `add` | Validates + upserts server into `servers.json`. |
| `removeServer` | config.ts:329 | `cli.ts` `remove` | Deletes server; `false` if file/server absent. |
| `maskSecrets` | config.ts:349 | `client.ts` `withMcpClient`; `cli.ts` `writeJson`, `writeError`, `servers`, `list`, `describe`, `call`, `ping` | Replaces known secrets (≥4 chars, longest first) with `***REDACTED***`. |

## `src/client.ts`

| Function | Defined | Called by | Purpose |
| -------- | ------- | --------- | ------- |
| `createTransport` | client.ts:8 | `withMcpClient` | Maps `ServerConfig` to SDK transport (`Stdio`/`StreamableHTTP`/`SSE`). |
| `withTimeout` | client.ts:46 | `withMcpClient` | `Promise.race` against a timer; rejects `MCP operation timed out after N ms`. |
| `errorMessage` | client.ts:67 | `withMcpClient` | `Error.message` or `String(error)`. |
| `isMethodNotFound` | client.ts:71 | `pingServer` | Detects JSON-RPC `-32601`. |
| `withMcpClient` | client.ts:80 | `pingServer`, `listServerTools`, `describeServerTool`, `callServerTool` | Connect → run `fn` under timeout → mask secrets on error → always close. |
| `pingServer` | client.ts:117 | `cli.ts` `ping` | Health check; `client.ping` with `listTools` fallback; returns `{ ok, latencyMs, serverInfo }`. |
| `listServerTools` | client.ts:145 | `cli.ts` `list` | `[{ name, description }]` per tool. |
| `describeServerTool` | client.ts:159 | `cli.ts` `describe` | Full tool object by name; throws `Tool "X" not found on server.` |
| `callServerTool` | client.ts:175 | `cli.ts` `call` | `client.callTool` under timeout; returns raw result (cli checks `isError`). |
| `truncateText` | client.ts:189 | `cli.ts` `call` | Caps text at `maxChars` with truncation notice. |

## `src/cli.ts`

| Function | Defined | Called by | Purpose |
| -------- | ------- | --------- | ------- |
| `parsePositiveInteger` | cli.ts:67 | `parseGlobalArguments` | Validates integer flag values (`--max-chars`, `--timeout`). |
| `requireFlagValue` | cli.ts:89 | `parseGlobalArguments`, `parseAddArguments` | Next arg as flag value; rejects missing/`--`-prefixed. |
| `parseGlobalArguments` | cli.ts:97 | `main` | Extracts global flags; rest → positionals. |
| `parseAddArguments` | cli.ts:151 | `runCommand` `add` | Parses `add` positionals + `--type`/`--token-env`. |
| `configuredSecrets` | cli.ts:195 | `loadConfigured` | Union of interpolated secrets + all literal header/env values. |
| `safeTarget` | cli.ts:206 | `runCommand` `servers` | Safe endpoint display: stdio command, or URL with credentials/query secrets stripped. |
| `writeJson` | cli.ts:227 | all JSON output paths | `JSON.stringify` + `maskSecrets` → stream. |
| `writeError` | cli.ts:236 | `main` catch | Masked error to stderr; JSON shape when `--json`. |
| `loadConfigured` | cli.ts:245 | `list`, `describe`, `call`, `ping` | `loadConfig` + refresh `context.secrets`. |
| `getServer` | cli.ts:254 | all server commands | Resolve named server or throw listing available names. |
| `requireNoOptions` | cli.ts:268 | `servers`, `remove`, `list`, `describe`, `ping` | Reject stray `-` options for fixed-arity commands. |
| `extractToolText` | cli.ts:275 | `runCommand` `call` | Text blocks → joined string; fallback `structuredContent`/raw JSON. |
| `runCommand` | cli.ts:304 | `main` | Dispatch: `servers`, `add`, `remove`, `list`, `describe`, `call`, `ping`. |
| `main` | cli.ts:544 | top-level `await` | `--help`/`--version` shortcuts, parse, dispatch, exit codes (2 usage / 1 runtime). |

## `build.mjs`

| Function | Defined | Called by | Purpose |
| -------- | ------- | --------- | ------- |
| `bundleText` | build.mjs:10 | main flow | Extracts `vib-mcp.mjs` output text from esbuild result. |
| `normalizeShebang` | build.mjs:20 | main flow | Collapses shebangs to single `#!/usr/bin/env node`. |

Top-level: esbuild build → optional `createRequire` banner rebuild → write
bundle → copy `servers.json` + `.env.example` → log size.
