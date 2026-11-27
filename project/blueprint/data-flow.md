# Data Flow

How one CLI invocation travels through the code, verified 2026-11-26.

## Startup

```
node .vib-mcp/vib-mcp.mjs <args>
  → src/cli.ts top-level `await main()`
  → -h/--help → print HELP_TEXT, exit 0
  → -v/--version → print VERSION (1.0.0), exit 0
  → parseGlobalArguments → { options: GlobalOptions, positionals }
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
      → withTimeout(client.connect(transport), serverConfig.timeout ?? globalTimeout)
      → withTimeout(fn(client), same timeout)
      → on error: throw maskSecrets(message, secrets)
      → finally: client.close() (transport.close() fallback)
```

## Output

- Text mode: human-readable lines to stdout; tool errors → stderr + exit 1.
- `--json`: `writeJson` → masked `JSON.stringify` to stdout (or stderr for
  `call` tool errors).
- `call` output passes through `extractToolText` → `truncateText(maxChars)`
  (default 8000; `0` disables; truncation adds a notice).
- `servers` masks each line via `safeTarget` + `maskSecrets`.

## Secrets lifecycle

1. `interpolateEnv` collects every resolved `${VAR}` value into a Set.
2. `configuredSecrets` unions those with all literal header/env values.
3. Every output path (`writeJson`, `writeError`, direct `process.stdout`
   writes, `withMcpClient` errors) runs text through `maskSecrets`.
4. `safeTarget` additionally strips URL credentials and redacts
   token-like query params for the `servers` listing.

## Build flow

```
npm run build → node build.mjs
  → esbuild(src/cli.ts, bundle, esm, node20, write:false)
  → if CJS require artifacts → rebuild with createRequire banner
  → write dist/.vib-mcp/vib-mcp.mjs (shebang normalized)
  → copy templates/servers.json, templates/.env.example
  → print bundle size
```
