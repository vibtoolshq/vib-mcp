# vib-mcp-client Mission and Project Blueprint

This document explains the project's purpose, boundaries, expected workflow,
and implementation architecture. The exact user-facing behavior is locked by
[`SPEC.md`](SPEC.md); where details differ, the specification is authoritative.

## 1. Project Identity

- **Name:** `vib-mcp-client`
- **Portable drop-in folder:** `.vib-mcp/`
- **License:** MIT
- **Category:** Portable, zero-dependency-at-runtime, single-file bundled MCP
  (Model Context Protocol) CLI client

The portable folder contains the bundled `vib-mcp.mjs`, a `servers.json`
configuration, and a private `.env` file when credentials are required.

## 2. Mission and Core Objective

AI IDEs and coding environments use different MCP configuration formats.
Setting up the same MCP servers repeatedly across projects, machines, and
tools is slow and fragile, and ties access to a particular IDE.

The mission of `vib-mcp-client` is to decouple MCP tool access from
IDE-specific settings. It provides one self-contained `.vib-mcp/` folder that
can be copied into a repository. Any developer or AI agent with local terminal
execution and Node.js can then discover and invoke configured MCP tools using
the same CLI, regardless of which IDE they use.

## 3. Intended Users

- Solo developers and software engineers working across multiple repositories.
- Teams sharing reviewed server definitions and `.env.example` templates in
  Git without committing credentials.
- AI coding agents operating in IDEs or terminal environments.
- Backend engineers who need a small CLI/runtime bridge to remote MCP servers.

## 4. Supported Environments and Boundaries

The client is intended for environments that can execute a local Node.js
process and provide shell or terminal access, including:

- VS Code Copilot, Cline, Antigravity IDE, Cursor, Windsurf, Claude Code, and
  Gemini CLI.
- Windows, Linux, and macOS terminals.
- CI/CD pipelines and Node.js backend workflows where CLI invocation is
  appropriate.

It does not run directly inside pure browser-based chat interfaces without
local terminal execution, such as ChatGPT Web or Gemini Web. Those interfaces
need a direct HTTPS MCP connector or another remote integration; they cannot
execute a local Node.js script merely because the project contains
`.vib-mcp/`.

The client is a CLI, not an IDE extension, hosted service, web application, or
replacement for an MCP server. It connects to configured MCP servers and
exposes their tools through commands.

## 5. When to Use It

Use the client when:

- A project needs access to external tools such as VPS management, DNS,
  databases, documentation, or internal APIs without IDE-specific setup.
- Developers or agents switch between multiple IDEs while working in the same
  codebase.
- A team wants to version-control shared server names, endpoints, and
  configuration shape while keeping credentials private.
- AI context efficiency matters: use `list`, then `describe` only the needed
  tool, then `call`; use `--max-chars` to cap large responses rather than
  loading every schema or full result into context.

## 6. Feature Set

- Configure multiple MCP servers in one `servers.json`; each command selects
  the named server it needs.
- Connect using Streamable HTTP (`http`), legacy Server-Sent Events (`sse`),
  or a local process over stdio (`stdio`).
- Use authenticated remote servers with Bearer tokens or other custom headers
  whose values interpolate `${ENV_VAR}` from `.vib-mcp/.env` or `process.env`.
- Use no-auth remote servers with only a transport type and URL.
- List configured servers with `servers`, compactly list tool names and short
  descriptions with `list`, inspect one tool's JSON input schema with
  `describe`, execute it with `call`, and check connectivity with `ping`.
- Add or update remote definitions with `add` and remove them with `remove`.
- Use `--json` for machine-readable output, `--max-chars` for bounded output,
  and `--timeout` to guard against hung requests.
- Keep secrets in `.vib-mcp/.env` or the process environment. Secret values
  must never appear in command output or error logs.

The full command, configuration, defaults, and exit-code contract is in
[`SPEC.md`](SPEC.md).

## 7. End-to-End Workflow

### Build Once

The source is TypeScript. `npm run build` uses esbuild to bundle the CLI and
`@modelcontextprotocol/sdk` into one portable file staged at
`dist/.vib-mcp/vib-mcp.mjs`. The published/dropped-in folder uses the path
`.vib-mcp/vib-mcp.mjs`. The resulting file must not require a colocated
`node_modules/` directory and requires Node.js 20 or newer.

### Drop Into a Project

Copy the bundle and the chosen server template into the target repository:

```sh
mkdir -p target-project/.vib-mcp
cp dist/.vib-mcp/vib-mcp.mjs target-project/.vib-mcp/
cp templates/servers.json target-project/.vib-mcp/servers.json
cp templates/.env.example target-project/.vib-mcp/.env
```

Replace placeholder values in `.vib-mcp/.env`; never commit that populated
file. Add `.vib-mcp/.env` to the target repository's `.gitignore`. Add these
two instruction lines to its `AGENTS.md`:

```markdown
- Use configured MCP tools through `node .vib-mcp/vib-mcp.mjs`.
- Read tool schemas before calling them; never read, print, or commit `.vib-mcp/.env`.
```

### Discover and Call Tools

The normal agent flow is to list a server's tools, inspect the selected
schema, then make a narrowly scoped call. Tool names and argument fields are
provided by each configured server, so the example names below are
illustrative and must be replaced with names returned by `list` and
`describe`.

List configured endpoints and check an authenticated VPS server:

```sh
node .vib-mcp/vib-mcp.mjs servers
node .vib-mcp/vib-mcp.mjs ping private-vps
node .vib-mcp/vib-mcp.mjs list private-vps
node .vib-mcp/vib-mcp.mjs describe private-vps get_server_status
node .vib-mcp/vib-mcp.mjs call private-vps get_server_status '{"server_id":"vps-prod-01"}'
```

Discover and call a public no-auth service in the same way, without an
authorization header:

```sh
node .vib-mcp/vib-mcp.mjs list public-docs
node .vib-mcp/vib-mcp.mjs describe public-docs search
node .vib-mcp/vib-mcp.mjs call public-docs search '{"query":"Node.js fetch"}'
```

Add an authenticated remote server by naming the environment variable, not
providing its secret value on the command line:

```sh
node .vib-mcp/vib-mcp.mjs add private-vps https://mcp.example.com/mcp --type http --token-env VPS_MCP_TOKEN
```

Put the actual `VPS_MCP_TOKEN` value in `.vib-mcp/.env` or the process
environment. For machine parsing or large outputs, use `--json` and
`--max-chars <number>`; the default output cap is 8,000 characters, and the
default request timeout is 30,000 milliseconds.

## 8. Technology and Architecture

- **Runtime:** Node.js 20+, ECMAScript modules, and built-in platform APIs
  such as `fetch`, `node:fs`, and `node:util` as needed.
- **Language:** TypeScript with strict type checking.
- **Protocol SDK:** `@modelcontextprotocol/sdk`, using its `Client`,
  `StreamableHTTPClientTransport`, `SSEClientTransport`, and
  `StdioClientTransport` APIs for the corresponding transports.
- **Bundler:** esbuild, producing one `.mjs` file with runtime dependencies
  bundled.

Module responsibilities:

| File            | Responsibility                                                                          |
| --------------- | --------------------------------------------------------------------------------------- |
| `src/types.ts`  | Shared configuration, command, and MCP data types.                                      |
| `src/config.ts` | Read and validate server configuration, load environment values, and resolve paths.     |
| `src/client.ts` | Create MCP connections and implement server/tool operations.                            |
| `src/cli.ts`    | Parse CLI commands and flags, coordinate operations, format output, and set exit codes. |
| `build.mjs`     | Bundle the CLI and runtime dependencies into the portable output.                       |

This module map is an ownership boundary, not a requirement to add layers or
abstractions beyond what the contract needs.

## 9. Engineering Guardrails

### Do

- Follow [`SPEC.md`](SPEC.md) for all user-facing behavior, output, security,
  defaults, and exit codes. Deliberately update the spec before changing that
  contract.
- Keep the runtime bundle portable: no `node_modules/` is required in the
  dropped-in `.vib-mcp/` folder.
- Keep secrets masked in normal output, diagnostics, and logs.
- Keep output concise and machine-friendly; preserve the compact `list` flow
  and bounded tool results.
- Keep responsibilities in the existing modules and run
  `npm run typecheck` after every change.
- Prefer existing dependencies and utilities.

### Don't

- Do not add heavy frameworks, databases, web UIs, or unrelated product
  features.
- Do not add interactive prompts, spinners, or other terminal UI that
  complicates AI-agent parsing or non-interactive use.
- Do not add npm dependencies unless they are strictly necessary to meet the
  specified behavior.
- Do not put application logic in documentation or configuration changes.
- Do not log, print, commit, or otherwise expose `.env` values, tokens, or API
  keys.

## 10. Definition of Done

A change is complete when it preserves the specification, respects the module
boundaries and security rules, keeps the portable bundle self-contained, and
passes `npm run typecheck`. Changes to command behavior, configuration, or
output must also be reflected deliberately in `SPEC.md` and covered by
appropriate focused validation.
