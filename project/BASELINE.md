# Vib MCP — Frozen development baseline

**Baseline ID:** BASELINE-01 | **Audit date:** 2026-11-27 (Asia/Dhaka)  
**Classification:** initial imported source; documentation freeze, static source evidence only.  
**Product/release readiness:** NO-GO; mandatory runtime verification and findings remain open.

## 1. Source of truth and identity

| Item | Verified value |
| --- | --- |
| Canonical development repo | [vibtoolshq/vib-mcp](https://github.com/vibtoolshq/vib-mcp), main |
| Backup/sync repo | [JILLU-Games/vib-mcp-client](https://github.com/JILLU-Games/vib-mcp-client), main |
| Audited canonical source commit (before freeze) | [5a3375108fbe96191cb25bbf14ff94dce1899eb8](https://github.com/vibtoolshq/vib-mcp/commit/5a3375108fbe96191cb25bbf14ff94dce1899eb8) |
| Audited backup source commit (before freeze) | [82bd8b5f18dc359d4085672f72c859405bc1f009](https://github.com/JILLU-Games/vib-mcp-client/commit/82bd8b5f18dc359d4085672f72c859405bc1f009) |
| Shared audited Git tree | `44775b4969aeafb86d350b70da104a90fe2425f2` |
| Audited tree inventory | 30 tracked files, 6 directory entries, 36 recursive entries; not truncated; all paths/modes/blob SHAs matched |
| Package/runtime identity | `vib-mcp-client@1.0.0`, ESM; CLI version and SDK client identity also 1.0.0 |
| Product license | MIT declared in package and mission; no tracked LICENSE file |
| Branches | main only on each repo at audit; protected=false on both |
| Releases/tags | 0 GitHub releases, 0 tag refs on each repo at audit |
| Open work records | 0 open issues and 0 open PRs returned on each repo at audit |
| GitHub Actions | 0 runs returned per repo; no tracked workflow files |

**Important:** the repository name is now vib-mcp, but package name, CLI identity and existing documentation are unchanged. Do not rename these incidentally. Different repo commit histories are intentional; compare trees, not commit SHA equality. The audited source SHAs above are immutable pre-documentation anchors, NOT the resulting documentation commit. The first commit adding this file is the freeze publication commit on canonical main; use Git history to resolve its exact SHA and tree, not a guessed hash. Subsequent changes must establish a new baseline rather than silently reinterpreting this snapshot. The backup is a tracked-tree mirror, not a backup of secrets, settings or complete Git history.

## 2. Purpose, contract and boundaries

Portable command-line MCP client for terminal-capable developers, agents and scripts. Not an MCP server, web UI, IDE extension or hosted service. The intended drop-in folder is .vib-mcp/; Node.js 20+ and no adjacent node_modules are the locked distribution requirements, not runtime-verified facts yet. Browser chat alone does not execute this local CLI.

Mandatory reading: [AGENTS](../AGENTS.md), [MISSION](MISSION.md), [SPEC](SPEC.md) (locked behavioral contract), [RELEASE](RELEASE.md), [findings and QA plan](FORENSIC-FINDINGS.md), [blueprint](blueprint/README.md), [user docs](../docs/README.md). Source is the evidence for current behavior; the specification defines intended behavior. Resolve discrepancies explicitly, never silently treat an old document as proof of execution.

## 3. Current implementation map (static)

| File | Ownership and behavior |
| --- | --- |
| src/types.ts | Shared HTTP/SSE/stdio config, flags and resolved config types; no runtime logic |
| src/config.ts | Read and validate JSON; resolve config path; parse sibling .env; interpolate selected header/env values; save/remove definitions; mask known strings |
| src/client.ts | SDK transport selection; connect/operate/close; ping/list/describe/call; timeout wrapper; text truncation |
| src/cli.ts | Argument parsing, dispatch, stdout/stderr, result extraction, exit codes, help/version |
| build.mjs | esbuild ESM node20 bundle, optional createRequire rebuild, shebang, copy safe templates |
| templates/ | Placeholder-only example environment and example HTTP/auth, no-auth HTTP, stdio definitions |

Control flow: CLI → validated definitions → selected server interpolation → SDK transport/connect → operation → close → format/mask/truncate result. Local servers/add/remove do not connect. Config path: explicit --config relative to cwd, otherwise script-adjacent servers.json if present, else cwd/.vib-mcp/servers.json; .env always sibling. .env values take precedence over process.env; missing/empty interpolated variables fail. Interpolation applies to remote headers and stdio env, not URLs/args. Stdio currently inherits process.env overlaid by configured env (trust boundary finding).

| Command | Current source behavior |
| --- | --- |
| servers | Local name/type/target/auth listing without interpolation or connection |
| list SERVER | One SDK listTools call; compact names/descriptions |
| describe SERVER TOOL | One listTools call, find by name, full tool object as pretty JSON |
| call SERVER TOOL [JSON] | Object args only; text blocks preferred, structured content/raw fallback; tool isError → stderr/exit 1 |
| ping SERVER | ping or listTools fallback for missing method; latency measures operation after connect |
| add NAME URL | Remote http/sse only; default http; optional --token-env persists reference; upserts definition |
| remove NAME | Local remove; absent name fails with exit 1 |
| help/version | -h/--help and -v/--version shortcuts; print text, exit 0 on normal execution |

Global defaults: --json off; --max-chars 8000 (0 disables, applies to call output text, notice/wrapper are additional); --timeout 30000 ms; --config optional. CLI accepts equals syntax for these three value flags. Exit code intent: success 0; runtime 1; usage 2. Current edge cases in findings. Configuration allows per-server positive finite timeout, but effective timeout is not consistently forwarded to SDK; not an established end-to-end deadline.

## 4. Dependencies/build evidence

| Direct package | Manifest range | Locked version |
| --- | --- | --- |
| @modelcontextprotocol/sdk | ^1.32.2 | 1.32.2 |
| @types/node | ^26.6.6 | 26.6.6 |
| esbuild | ^0.28.2 | 0.28.2 |
| tsx | ^4.23.15 | 4.23.15 |
| typescript | ^7.0.2 | 7.0.2 |

Lockfile v3; 148 packages-map entries including root, 147 resolved registry entries with integrity strings; all resolved URLs use registry.npmjs.org. Direct dependency names/ranges match manifest. Integrity strings being present is not verification of downloaded bytes, compatibility, vulnerability status or installability. TypeScript strict, NodeNext module/resolution, ES2022, noEmit; bundle target node20. Scripts: dev (tsx src/cli.ts), typecheck (tsc --noEmit), build (node build.mjs). No test/lint scripts.

Build stages exactly the intended three output paths in dist/.vib-mcp/ by source inspection: vib-mcp.mjs, servers.json, .env.example. Existing extra files in dist are not cleaned by build. No release/ or dist/ tracked, no populated .env tracked at this snapshot. No artifact was built or inspected; no claim about external untracked files or historical secrets. Release must follow RELEASE.md and explicit authorization.

## 5. Acceptance matrix

| Gate | Status | Evidence / limitation |
| --- | --- | --- |
| Immutable pre-freeze tree comparison | PASS | Both recursive Git trees identical |
| Tracked file review | PASS (static) | All 30 files read; lock JSON structurally summarized |
| Source command/transport paths | PRESENT (static) | Four TS modules and build script |
| GitHub CI evidence | ABSENT | Actions runs total_count=0 in both repos; no workflow |
| npm ci | NOT RUN / BLOCKED | Isolated container DNS failed for GitHub and npm registry; SDK cache absent |
| npm run typecheck | NOT RUN / BLOCKED | Mandatory AGENTS.md gate not satisfied; no installed project dependencies |
| npm run build | NOT RUN | No bundle inspected |
| Automated regression tests | ABSENT | No test suite tracked or test script |
| Node 20/22+, Windows/Linux/macOS acceptance | NOT RUN | No verified runtime matrix |
| Standalone portable smoke / mock MCP | NOT RUN | No execution evidence |
| Live MCP/auth/tool calls | NOT RUN | No real endpoints/tokens used |
| Dependency advisory scan / historical secret scan | NOT RUN | No vulnerability count or blanket secret guarantee claimed |
| Release authorization and full release gate | NO-GO | Unresolved findings + missing evidence; no release authorized |

Historical docs marked verified 2026-11-26 are inherited assertions, not independent test results. GitHub API observations are point-in-time; no repository settings were changed. No test results fabricated. This document fixes the identity of the source, not its defects. Documentation phase may close after exact scope and parity checks; product readiness stays blocked.

## 6. Safe continuation

1. Read AGENTS.md, this file, locked spec, findings, notes/ manifest and release rules.
2. Resolve canonical main HEAD and recursive tree. For the first post-freeze task, inspect the commit adding project/BASELINE.md; ensure current HEAD is that publication commit or an explicitly reviewed successor. Confirm backup tree parity. If drift exists, stop and reconcile, not overwrite.
3. Scope-lock one phase with explicit writable paths, test criteria, exclusions, rollback and approval. Record a note before code changes.
4. First recommended phase is BASELINE-QA-01 in the findings document: establish isolated frozen install, typecheck, build, standalone and synthetic MCP evidence. No production secrets or live tools. Fixes require separate approved scope and evidence.
5. Keep spec changes deliberate; update project, blueprint, docs and notes together when behavior changes. Maintain indexes. Review exact diff, run focused validation and sync canonical → backup only after verification; never force-push by default.
6. Do not create release directories, tags, GitHub releases, npm publish or deployments before full gate and separate authorization. Version 1.0.0 is source metadata only.

Rollback of this documentation-only freeze: use an approved revert of the publication commit(s), retaining history; do not reset or force push. Application source anchor remains the SHA above. Record new baseline identifiers after subsequent accepted phases.

## 7. Immutable pre-freeze tracked-file inventory

The following 30 rows are the exact audited tree, not a live file listing. All are Git blobs with mode 100644. Reproduce with `git ls-tree -r <audited-commit>` and compare path/mode/object ID. The documentation-only publication intentionally changes the Markdown index and adds reports; non-Markdown files must retain every audited blob.

| Path | Bytes | Mode | Git blob SHA |
| --- | ---: | --- | --- |
| `.gitignore` | 55 | `100644` | `de26ba69a3a3017b506196229d208de3d595ace3` |
| `AGENTS.md` | 3455 | `100644` | `d4a687bbb421d094c20d7c40bc986c84635d7322` |
| `README.md` | 3856 | `100644` | `50c8752fab537a5167085d8839aae48bbc7fb019` |
| `build.mjs` | 1880 | `100644` | `def6618c8dcc0df3fd457367a901ad6e96af6b27` |
| `docs/MANIFEST.md` | 465 | `100644` | `e7effe5bba0ecb0474ec7a87f6cdc302ce8dfbb1` |
| `docs/README.md` | 1104 | `100644` | `2b543f94123853ba64fcdaf61d98c044b277a417` |
| `docs/cli-commands.md` | 4307 | `100644` | `fb4bcea5bee856ebb6f2804e4c2d9c44722910a2` |
| `docs/configuration.md` | 3795 | `100644` | `2106f8580f05a500f3c0fae8020bb128d999ee49` |
| `notes/MANIFEST.md` | 264 | `100644` | `f158c41c5b64c8dfb0f11dd52771b1de3ce9de26` |
| `notes/README.md` | 1060 | `100644` | `d9583c0ce4d5eb36a208ad25d26cf3e471934275` |
| `package-lock.json` | 71501 | `100644` | `2ace57a76af3b9d4d6c4d687d184377aaae171d1` |
| `package.json` | 407 | `100644` | `fdbdcd19cdcc65656f6c576939082b7b0072b84e` |
| `project/MANIFEST.md` | 736 | `100644` | `7f6748f4eb9d74d1dbe35b6554f21e4d0c8da634` |
| `project/MISSION.md` | 9668 | `100644` | `8682d0e68c687f20030ad3c8978b696bbb327d27` |
| `project/README.md` | 1649 | `100644` | `7f22d54a1e6364b54b8e2ef4448ff67df408da4d` |
| `project/RELEASE.md` | 3227 | `100644` | `f819ba2c8d3598065152c44024e2d9929adab441` |
| `project/SPEC.md` | 4083 | `100644` | `e2f8c8d705855b8511ca05e85f0a25157354b89e` |
| `project/blueprint/MANIFEST.md` | 583 | `100644` | `e016a3acdaade92992d569aa4878e95130304e77` |
| `project/blueprint/README.md` | 1060 | `100644` | `42dc352931d15da32baeb1316977306d4161a6c1` |
| `project/blueprint/data-flow.md` | 3207 | `100644` | `062b35c8db3ffcda0a5984668657e2b7de8293b3` |
| `project/blueprint/files.md` | 3080 | `100644` | `97787ce50f757365e0b513fb0b41d03469fa8e1d` |
| `project/blueprint/functions.md` | 6068 | `100644` | `3a327f2ab364c11ca8269359752659da71618763` |
| `project/blueprint/modules.md` | 6878 | `100644` | `af0470888db6ceb94b61cbf17e9452e52b53b298` |
| `src/cli.ts` | 16665 | `100644` | `efbb3092aeaf9553e9b573a3ce109a6ae7ca5e68` |
| `src/client.ts` | 5687 | `100644` | `8f70d649ca6bac49b1878607ba2d1cf5492f2200` |
| `src/config.ts` | 10191 | `100644` | `1dc5b8fe3597b4a2c43a2dfea4617c68debdb2fd` |
| `src/types.ts` | 676 | `100644` | `f1df1bb8c733f76a54a2429a3489c8807e968669` |
| `templates/.env.example` | 30 | `100644` | `7e7eef7cefeed6006d8ace94aed8c4b796ccdffd` |
| `templates/servers.json` | 429 | `100644` | `a64ca46fd4261c9d86880f28c19d6ec8d23fb98b` |
| `tsconfig.json` | 209 | `100644` | `c67a02d78c629f09164fb7bdfee87c4b23af2ad0` |
