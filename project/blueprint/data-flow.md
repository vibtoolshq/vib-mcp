# Data Flow

How one CLI invocation travels through the code, reviewed 2026-11-27 (LIFE-01 candidate).

## Startup

```
node .vib-mcp/vib-mcp.mjs <args>
  → src/cli.ts top-level `await main()`
  → -h/--help → print HELP_TEXT, exit 0
  → -v/--version → print VERSION (1.0.0), exit 0
  → parseGlobalArguments → { options: GlobalOptions, positionals }
  → collectConfigSecrets(configPath)           // before validation
  → runCommand(command, commandArgs, context)
```

Any thrown `UsageError` → exit code **2**; any other error → exit code **1**
(both via `writeError` with secrets masked).

## Config loading (every server command)

```
runCommand(list|describe|call|ping)
  → loadServerDefinitions(configPath)          // un-interpolated, existence check
  → getServer(definitions, name)               // throws w/ available names if missing
  → loadConfigured(context, name)              // = loadConfig + configuredSecrets
      → resolveConfigPaths(--config?)          // --config > script-adjacent > ./.vib-mcp/
      → readServersFile → parseServersFile     // JSON + validateServerConfig per entry
      → parseEnvFile(.env sibling)             // missing file → {}
      → interpolateEnv per header/env value    // ${VAR} from .env then process.env
                                               // missing var → throw; values → secrets set
  → getServer(config, name)                    // interpolated config
```

`servers`, `add`, `remove` use `loadServerDefinitions`/`saveServer`/
`removeServer` directly (no env interpolation needed).

## MCP operation

```
listServerTools / describeServerTool / callServerTool / pingServer
  → withMcpClient(serverConfig, timeoutMs, secrets, fn)
      → createTransport(config)                // stdio | http | sse → SDK transport
      → new Client({ name: "vib-mcp-client", version: "1.0.0" })
      → effective = serverConfig.timeout ?? globalTimeout
      → withTimeout(options => client.connect(transport, options), effective)
      → withTimeout(options => fn(client, options), effective) // shared operation signal for fallback
      → on error: throw maskSecrets(message, secrets)
      → finally: closeBounded(client.close, transport.close) // total 5000 ms; report failure
```

## Output

- Text mode: human-readable lines to stdout; tool errors → stderr + exit 1.
- `--json`: `writeJson` → structure-aware sanitization → `JSON.stringify` to stdout (or stderr for
  `call` tool errors).
- `call` output passes through sanitized `extractToolText` → `truncateText(maxChars)`
  (default 8000; `0` disables; truncation adds a notice).
- `servers` masks each line via `safeTarget` + `maskSecrets`.

## Secrets lifecycle

1. Collect known values from sibling env and parsed config before validation; resolve references without stopping on a missing sibling value.
2. `configuredSecrets` unions that context with resolved and literal header/env variants.
3. Mask text and errors; sanitize JSON values and dynamic keys before serialization. Fixed contract keys and primitive types stay intact; collisions fail closed.
4. `safeTarget` strips userinfo and sensitive query values; known path credentials are masked.
5. Stdio inherits SDK platform defaults plus explicit env only; raw child stderr is suppressed. This is not a process sandbox.

## Build flow

```
npm run build → node build.mjs
  → esbuild(src/cli.ts, bundle, esm, node20, write:false)
  → if CJS require artifacts → rebuild with createRequire banner
  → write dist/.vib-mcp/vib-mcp.mjs (shebang normalized)
  → copy templates/servers.json, templates/.env.example
  → print bundle size
```

LIFE-01: the phase timer aborts the public SDK signal and is cleared on settlement. Transport shutdown also handles start/notification I/O not covered by request options. A primary operation error remains primary, with a masked cleanup diagnostic appended when cleanup is unconfirmed. Separate connect and operation deadlines are not an end-to-end deadline.
