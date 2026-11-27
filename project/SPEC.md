# vib-mcp-client Specification

This document defines the locked user-facing contract for `vib-mcp-client`.
Implementation and documentation changes must preserve it unless this
specification is deliberately revised first.

## Portable Output

The build produces one self-contained executable file at
`.vib-mcp/vib-mcp.mjs`. It bundles its runtime dependencies, requires no
`node_modules/` beside it, and runs on Node.js 20 or newer. A portable
installation also contains:

- `.vib-mcp/servers.json` for server definitions.
- `.vib-mcp/.env` for local secrets and environment values.

The `.env` file is local configuration and must not be committed.

## Server Configuration

`servers.json` is a JSON object with a `servers` object keyed by server name.
Each value has exactly one supported `type`:

- `http`: MCP Streamable HTTP; requires `url` and may include `headers`.
- `sse`: legacy MCP Server-Sent Events; requires `url` and may include
  `headers`.
- `stdio`: local process; requires `command` and may include `args` and `env`.

Remote `headers` is an object of header names to string values. Header values
may interpolate `${ENV_VAR}` references from `.vib-mcp/.env` and
`process.env`. A remote server with no authentication needs only its `type`
and `url`; headers are not required.

For `stdio`, `args` is an array of strings and `env` is an object of
environment-variable names to string values.

Example:

```json
{
  "servers": {
    "private-http": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${VPS_MCP_TOKEN}"
      }
    },
    "public-http": {
      "type": "http",
      "url": "https://public.example.com/mcp"
    },
    "local": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-server.mjs"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## CLI Commands

The portable CLI is invoked with `node .vib-mcp/vib-mcp.mjs`.

| Command                            | Contract                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `servers`                          | List configured server names, types, and endpoints. Never reveal tokens or secrets. |
| `list <server>`                    | List available tools with only each tool's name and short description.              |
| `describe <server> <tool>`         | Print the full JSON input schema for one tool.                                      |
| `call <server> <tool> [json_args]` | Execute a tool with optional JSON arguments and print its response.                 |
| `ping <server>`                    | Test the server connection and report a health-check result.                        |
| `add <name> <url> [--type http     | sse] [--token-env VAR_NAME]`                                                        | Add or update a remote server in `servers.json`. `--token-env` stores an environment-variable reference, never a token value. |
| `remove <name>`                    | Remove a server definition from `servers.json`.                                     |

## Global Flags

- `--json`: emit clean, machine-readable JSON.
- `--max-chars <number>`: cap large tool output at 8,000 characters by
  default. Truncated output must include a clear notice.
- `--timeout <ms>`: abort requests that exceed 30,000 milliseconds by default.
- `--config <path>`: use a custom `servers.json`. Without it, configuration
  defaults to `.vib-mcp/servers.json`, resolved relative to the script or
  current working directory.

## Security and Exit Codes

- Never print Bearer tokens, API keys, or `.env` values to stdout, stderr, or
  error logs.
- Never include secret values in server listings or error details.
- Exit with `0` on success, `1` on runtime or connection errors, and `2` on
  invalid CLI usage.
