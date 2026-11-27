# vib-mcp-client

A portable MCP command-line client that separates tool access from
IDE-specific configuration. Build once, drop `.vib-mcp/` into a repository,
and use the same commands from terminal-capable IDEs, agents, and scripts.
The bundle is a single `.mjs` file, requires Node.js 20+, and needs no
`node_modules/` at runtime.

See the [project mission](project/MISSION.md) for purpose, boundaries,
architecture, and end-to-end workflows. See the [locked specification](project/SPEC.md)
for the exact configuration, CLI, security, and exit-code contract.

## Key Features

- Multiple MCP server definitions in one portable `servers.json`.
- Streamable HTTP, legacy SSE, and local stdio transports.
- Authenticated servers with `.env` interpolation and no-auth endpoints.
- Compact tool discovery (`list` then `describe`), calls, health checks, and
  server management.
- `--json`, bounded output with `--max-chars`, and request timeouts.

## Quick Start

Build the bundle from this repository:

```sh
npm install
npm run typecheck
npm run build
```

Copy `dist/.vib-mcp/vib-mcp.mjs` to the target project's `.vib-mcp/` folder.
Copy `templates/servers.json` there as `servers.json`; copy
`templates/.env.example` as `.env`, replace placeholders, and add
`.vib-mcp/.env` to the target project's `.gitignore`.

Add these two lines to the target project's `AGENTS.md`:

```markdown
- Use configured MCP tools through `node .vib-mcp/vib-mcp.mjs`.
- Read tool schemas before calling them; never read, print, or commit `.vib-mcp/.env`.
```

## Portable Drop-in Usage

Build the bundle, then place the output and configuration in the target
project:

```text
project-root/
└── .vib-mcp/
    ├── vib-mcp.mjs
    ├── servers.json
    └── .env
```

Copy `templates/servers.json` to `.vib-mcp/servers.json`. Copy
`templates/.env.example` to `.vib-mcp/.env` and replace its placeholder values.
The populated `.env` file contains secrets and must remain untracked.

## CLI Commands

Run the portable client with `node .vib-mcp/vib-mcp.mjs`:

| Command                                                      | Purpose                                      |
| ------------------------------------------------------------ | -------------------------------------------- |
| `servers`                                                    | List configured names, types, and endpoints. |
| `list <server>`                                              | List tool names and short descriptions.      |
| `describe <server> <tool>`                                   | Show a tool's full JSON input schema.        |
| `call <server> <tool> [json_args]`                           | Call a tool with optional JSON arguments.    |
| `ping <server>`                                              | Check a server connection.                   |
| `add <name> <url> [--type http\|sse] [--token-env VAR_NAME]` | Add or update a remote server.               |
| `remove <name>`                                              | Remove a server definition.                  |

Global flags: `--json` for machine-readable output, `--max-chars <number>`
(default `8000`) to truncate large outputs with a notice, `--timeout <ms>`
(default `30000`) to abort hung requests, and `--config <path>` to choose a
custom `servers.json`. The default config path is `.vib-mcp/servers.json`,
resolved relative to the script or current working directory.

Exit codes are `0` for success, `1` for runtime or connection errors, and `2`
for invalid CLI usage.

## Security

Keep credentials in `.vib-mcp/.env` or the process environment. The bundle
must never print Bearer tokens, API keys, or `.env` values to stdout, stderr,
or error logs. The repository `.gitignore` excludes `.env` and
`.vib-mcp/.env`; ensure the target project also ignores its populated
`.vib-mcp/.env` file.
