# project/blueprint/

Deep internal map of `vib-mcp-client`. This folder answers, for the whole
codebase: what each function does, which files exist and where, what logic
lives where, how modules are set up, why each module is used, where each
piece is needed, and how everything connects.

## Contents

| File | Purpose |
| ---- | ------- |
| `modules.md` | Module-by-module breakdown: responsibility, exports, dependencies, why it exists. |
| `files.md` | Every file in the repo: location, purpose, what it is used for. |
| `functions.md` | Function-level map: what each function does, where it is defined, where it is called. |
| `data-flow.md` | How a CLI invocation flows from `process.argv` to an MCP server and back. |
| `README.md` | This file. |
| `MANIFEST.md` | Index of files in this folder. |

## Rules

- Keep this folder accurate **in the same change** as any code change.
- When a function, file, module, or flow changes, update the matching doc here.
- Record the date of the last verification for each file.

See `MANIFEST.md` for the index.

SEC-01/A01 candidate: security-context collection, structured redaction and stdio environment/stderr boundaries are described in the module, function and flow maps. Runtime acceptance is tracked in [SEC-01 evidence](../SEC-01-EVIDENCE.md).

LIFE-01 candidate: effective timeout, connect/operation cancellation and bounded cleanup are described in the module, function and flow maps. Runtime acceptance: [LIFE-01 evidence](../LIFE-01-EVIDENCE.md).
