# Repository Agent Rules

- **Resume checkpoint:** Before a new development phase, read [`project/BASELINE.md`](project/BASELINE.md) and [`project/FORENSIC-FINDINGS.md`](project/FORENSIC-FINDINGS.md). Verify the canonical and backup Git trees and any newer accepted phase evidence. A documentation freeze is not a release sign-off.

- **Mandatory:** Read [`project/MISSION.md`](project/MISSION.md) and
  [`project/SPEC.md`](project/SPEC.md) before making any architectural or code
  changes.
- Follow [`project/SPEC.md`](project/SPEC.md) as the locked behavior and output
  contract. Update the specification deliberately before changing its contract.
- Keep implementation modular: `src/types.ts`, `src/config.ts`,
  `src/client.ts`, and `src/cli.ts` own types, configuration, MCP operations,
  and command-line behavior respectively.
- Run `npm run typecheck` after every change.
- Do not add dependencies unless they are necessary for the specified behavior;
  prefer the existing dependencies.
- Do not write application logic as part of documentation or configuration
  changes.

## Release Structure & Governance Rules

- Read [`project/RELEASE.md`](project/RELEASE.md) before release-related work.
- Keep the required version layout as
  `release/vX.Y.Z/.vib-mcp/{vib-mcp.mjs,servers.json,.env.example}`.
- AI agents must not create, edit, or delete anything inside `release/` unless
  the user explicitly instructs them to do so after the full forensic audit
  and bug-fix pass.
- Keep builds staged in `dist/.vib-mcp/`; `npm run build` must never create or
  modify files under `release/`.
- When a release is authorized, include only the bundle, `servers.json`, and
  `.env.example` in the required `.vib-mcp/` layout. Never copy a populated
  `.env` file or real token into `dist/` or `release/`; also exclude
  `node_modules/`, source files, and logs.
- Treat existing version directories as immutable; create a new version
  directory rather than replacing an existing release.

## Documentation & Notes Rules

Three documentation folders are maintained. Each has a `README.md` (purpose,
rules, when to use) and a `MANIFEST.md` (index of every file/subfolder with
phase/status). Keep both updated whenever files change.

- **`notes/`** — personal development-time notes only: planning, ideas, and
  step/phase logs. Before starting any update, fix, or feature, write or
  update a note here. Log what changed, which phase/step, and when. Do not
  store secrets here.
- **`project/`** — committed A-Z project development record: mission, locked
  spec, release rules, feature details, planning, and change logs. Every code
  change, update, fix, or feature must be documented here in the same change,
  alongside the code. `project/blueprint/` holds the deep internal map
  (modules, files, functions, data flow); update it whenever code changes.
- **`docs/`** — committed A-Z end-user guide: every feature documented with
  what/why/where/when/how. All details must be real and verified against the
  code or `project/SPEC.md` — never guess or assume. Update docs in the same
  change as the behavior they describe.

## End-User Project `AGENTS.md` Snippet

Copy this section into an end-user project's `AGENTS.md` when the portable
client is installed there:

```markdown
## MCP Tools

- Use configured MCP tools through `node .vib-mcp/vib-mcp.mjs`.
- Discover servers with `node .vib-mcp/vib-mcp.mjs servers`.
- Discover tools with `node .vib-mcp/vib-mcp.mjs list <server>`.
- Read a tool's input contract with
  `node .vib-mcp/vib-mcp.mjs describe <server> <tool>` before calling it.
- Run tools with
  `node .vib-mcp/vib-mcp.mjs call <server> <tool> [json_args]`.
- Never read, print, or commit `.vib-mcp/.env` or expose its values.
```
