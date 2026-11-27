# Functions

Function-level map: what each function does, where it is defined, and where it
is called. Verified against `src/` on 2026-11-26.

## `src/types.ts`

Type-only module — no functions.

## `src/config.ts`

| Function | Defined | Called by | Purpose |
| -------- | ------- | --------- | ------- |
| `isRecord` | config.ts (symbol) | `isStringRecord`, `validateServerConfig`, `parseServersFile`, `parseEnvFile` consumers | Type guard: non-null, non-array object. |
| `isStringRecord` | config.ts (symbol) | `validateServerConfig` | Type guard: object whose values are all strings (for `headers`/`env`). |
| `validateTimeout` | config.ts (symbol) | `validateServerConfig` | Optional per-server `timeout` must be a positive finite number. |
| `validateServerConfig` | config.ts (symbol) | `parseServersFile`, `saveServer` | Validates one server entry by `type`; returns typed `ServerConfig`. |
| `parseServersFile` | config.ts (symbol) | `readServersFile` | `JSON.parse` + structural validation of whole file. |
| `readServersFile` | config.ts (symbol) | `loadServerDefinitions`, `loadConfig`, `saveServer`, `removeServer` | Reads file → `parseServersFile`; ENOENT → friendly error. |
| `writeServersFile` | config.ts (symbol) | `saveServer`, `removeServer` | Writes `{ servers }` as pretty JSON, creating parent dir. |
| `resolveConfigPaths` | config.ts (symbol) | `loadServerDefinitions`, `loadConfig`, `saveServer`, `removeServer` | Resolves `configPath` (`--config` > script-adjacent > `./.vib-mcp/`) and sibling `envPath`. |
| `loadServerDefinitions` | config.ts (symbol) | `cli.ts` (`servers`, `list`, `describe`, `call`, `ping`) | Un-interpolated read for existence checks and `servers` listing. |
| `parseEnvFile` | config.ts (symbol) | `loadConfig` | Parses `.env` into key/value map; missing file → `{}`. |
| `interpolateEnv` | config.ts (symbol) | `loadConfig` | `${VAR}` substitution from envMap then `process.env`; throws on missing; collects secret values. |
| `loadConfig` | config.ts (symbol) | `cli.ts` `loadConfigured` | Full config pipeline → `ResolvedConfig` (paths, interpolated servers, secrets). |
| `saveServer` | config.ts (symbol) | `cli.ts` `add` | Validates + upserts server into `servers.json`. |
| `removeServer` | config.ts (symbol) | `cli.ts` `remove` | Deletes server; `false` if file/server absent. |
| `maskSecrets` | config.ts (symbol) | `client.ts` `withMcpClient`; `cli.ts` `writeJson`, `writeError`, `servers`, `list`, `describe`, `call`, `ping` | Masks nonempty known secrets, longest first at each match; avoids reprocessing inserted markers. |

## `src/client.ts`

| Function | Defined | Called by | Purpose |
| -------- | ------- | --------- | ------- |
| `createTransport` | client.ts (symbol) | `withMcpClient` | Maps `ServerConfig` to SDK transport; stdio platform defaults plus explicit env and stderr suppression. |
| `withTimeout` | client.ts (symbol) | `withMcpClient` | `Promise.race` against a timer; rejects `MCP operation timed out after N ms`. |
| `errorMessage` | client.ts (symbol) | `withMcpClient` | `Error.message` or `String(error)`. |
| `isMethodNotFound` | client.ts (symbol) | `pingServer` | Detects JSON-RPC `-32601`. |
| `withMcpClient` | client.ts (symbol) | `pingServer`, `listServerTools`, `describeServerTool`, `callServerTool` | Connect → run `fn` under timeout → mask secrets on error → always close. |
| `pingServer` | client.ts (symbol) | `cli.ts` `ping` | Health check; `client.ping` with `listTools` fallback; returns `{ ok, latencyMs, serverInfo }`. |
| `listServerTools` | client.ts (symbol) | `cli.ts` `list` | `[{ name, description }]` per tool. |
| `describeServerTool` | client.ts (symbol) | `cli.ts` `describe` | Full tool object by name; throws `Tool "X" not found on server.` |
| `callServerTool` | client.ts (symbol) | `cli.ts` `call` | `client.callTool` under timeout; returns raw result (cli checks `isError`). |
| `truncateText` | client.ts (symbol) | `cli.ts` `call` | Caps text at `maxChars` with truncation notice. |

## `src/cli.ts`

| Function | Defined | Called by | Purpose |
| -------- | ------- | --------- | ------- |
| `parsePositiveInteger` | cli.ts (symbol) | `parseGlobalArguments` | Validates integer flag values (`--max-chars`, `--timeout`). |
| `requireFlagValue` | cli.ts (symbol) | `parseGlobalArguments`, `parseAddArguments` | Next arg as flag value; rejects missing/`--`-prefixed. |
| `parseGlobalArguments` | cli.ts (symbol) | `main` | Extracts global flags; rest → positionals. |
| `parseAddArguments` | cli.ts (symbol) | `runCommand` `add` | Parses `add` positionals + `--type`/`--token-env`. |
| `configuredSecrets` | cli.ts (symbol) | `loadConfigured` | Union of pre-validation, interpolated and configured secret variants. |
| `safeTarget` | cli.ts (symbol) | `runCommand` `servers` | Safe endpoint display: stdio command, or URL with credentials/query secrets stripped. |
| `writeJson` | cli.ts (symbol) | all JSON output paths | `sanitizeJson` → `JSON.stringify` → stream. |
| `writeError` | cli.ts (symbol) | `main` catch | Masked error to stderr; JSON shape when `--json`. |
| `loadConfigured` | cli.ts (symbol) | `list`, `describe`, `call`, `ping` | `loadConfig` + refresh `context.secrets`. |
| `getServer` | cli.ts (symbol) | all server commands | Resolve named server or throw listing available names. |
| `requireNoOptions` | cli.ts (symbol) | `servers`, `remove`, `list`, `describe`, `ping` | Reject stray `-` options for fixed-arity commands. |
| `extractToolText` | cli.ts (symbol) | `runCommand` `call` | Text blocks → masked joined string; structured/raw fallback sanitized before JSON serialization, then truncation. |
| `runCommand` | cli.ts (symbol) | `main` | Dispatch: `servers`, `add`, `remove`, `list`, `describe`, `call`, `ping`. |
| `main` | cli.ts (symbol) | top-level `await` | `--help`/`--version` shortcuts, parse, dispatch, exit codes (2 usage / 1 runtime). |

## `build.mjs`

| Function | Defined | Called by | Purpose |
| -------- | ------- | --------- | ------- |
| `bundleText` | build.mjs:10 | main flow | Extracts `vib-mcp.mjs` output text from esbuild result. |
| `normalizeShebang` | build.mjs:20 | main flow | Collapses shebangs to single `#!/usr/bin/env node`. |

Top-level: esbuild build → optional `createRequire` banner rebuild → write
bundle → copy `servers.json` + `.env.example` → log size.

### SEC-01 candidate function additions

| Function | Defined in | Used by | Responsibility |
| --- | --- | --- | --- |
| `addSecret` | config.ts | collectors and CLI | Register raw, URI/form and JSON-escaped variants. |
| `collectUrlSecrets` | config.ts | collector and CLI add | Known userinfo and sensitive query values. |
| `collectValue` | config.ts | `collectConfigSecrets` | Resolve references without aborting collection on missing sibling values. |
| `collectConfigSecrets` | config.ts | CLI main | Collect known context before structural validation. |
| `sanitizeJson` | cli.ts | `writeJson`, `extractToolText` | Sanitize values and dynamic keys, preserve structural keys/types, reject collision. |

Source symbol anchors replace stale line offsets for the three changed modules. Candidate runtime evidence is separate.
