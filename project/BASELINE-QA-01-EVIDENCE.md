# BASELINE-QA-01 — Acceptance evidence

Status: one CI run COMPLETED / FAILURE. QA_EVIDENCE_COMPLETE for implemented checks; QA_EVIDENCE_PARTIAL for broader unmeasured acceptance subcases. RUNTIME_ACCEPTANCE_FAIL. Production NO-GO. Main and backup remain read-only. See [scope lock](../notes/BASELINE-QA-01.md) and [original findings](FORENSIC-FINDINGS.md).

Expected source parent: e43fefd1695103ce7f9d353adb2ea3f4060f7376. Expected original tree: 457d0e304b1bcdfff46b9ab4a6bec785aa600e5c. Tested candidate: bf9c3ec8a83f005eabce785c34cb61a0f666058c; tree a384d01232975b508bd885298b75bcb719acb206. Run 45928147183, attempt 1, event push, completed failure. One run only, no reruns or source fixes. Node 20/22 x Linux/Windows; macOS deferred. Tests use built-in Node runner and harmless local mocks.

| Gate | Requirement | Runtime outcome |
| --- | --- | --- |
| QA-01 | exact candidate scope | PASS — implemented checks on all four jobs |
| QA-02 | immutable source | PASS — implemented checks on all four jobs |
| QA-03 | toolchain | PASS — implemented checks on all four jobs |
| QA-04 | frozen install | PASS — implemented checks on all four jobs |
| QA-05 | typecheck | PASS — implemented checks on all four jobs |
| QA-06 | build | PASS — implemented checks on all four jobs |
| QA-07 | staging layout | PASS — implemented checks on all four jobs |
| QA-08 | standalone execution | PASS — tested standalone smoke; no direct executable mode qualification |
| QA-09 | help/version | PASS — implemented checks on all four jobs |
| QA-10 | servers | PASS — implemented checks on all four jobs |
| QA-11 | add/upsert | PASS — implemented checks on all four jobs |
| QA-12 | remove | PASS — implemented checks on all four jobs |
| QA-13 | config path | PASS — implemented checks on all four jobs |
| QA-14 | env precedence | PASS — implemented checks on all four jobs |
| QA-15 | validation | FAIL — invalid protocol and unsafe timer accepted; basic invalid config PASS |
| QA-16 | CLI contract | FAIL — 2 usage exit-code failures; basic CLI assertions PASS |
| QA-17 | config writes | FAIL — lost concurrent updates and dropped unknown fields; malformed config preservation PASS |
| QA-18 | stdio | PASS — implemented checks on all four jobs |
| QA-19 | HTTP | PASS — implemented checks on all four jobs |
| QA-20 | SSE | PASS — implemented checks on all four jobs |
| QA-21 | ping fallback | PASS — implemented checks on all four jobs |
| QA-22 | pagination | FAIL — all 3 pagination assertions failed; missing-tool subassertion NOT RUN after preceding failure |
| QA-23 | tool call/error/truncation | PASS — implemented checks on all four jobs |
| QA-24 | timeout/cleanup | FAIL — timeout override; hanging HTTP exit and owned stdio child cleanup PASS |
| QA-25 | redaction | FAIL — short canary and endpoint leak; known long canary masking PASS |
| QA-26 | JSON integrity | FAIL — invalid JSON after structural masking; escaped canary case PASS |
| QA-27 | stdio trust | FAIL — unrelated synthetic environment value inherited/exposed |
| QA-28 | advisory scans | PASS — Linux Node 22 only, runtime/full audit exit 0, zero reported advisories |
| QA-29 | artifact safety | PASS — implemented allowlist/templates/shebang checks only; historical scan NOT RUN |
| QA-30 | cleanup/integrity | PASS — tracked worktree integrity; owned stdio child cleanup assertion PASS; broader leak/fault tests NOT RUN |

Contract failures must remain failures; evidence collection is distinct from runtime acceptance. Any unexecuted subcase (including fault injection, historical secret scan, direct executable mode or close-specific fault injection if not measured) remains NOT RUN, not PASS. No real credentials, external tool calls, publication or release. Evidence follow-up is Markdown-only and must not trigger workflow.

## Terminal evidence — 2026-11-27 UTC

[Run 45928147183](https://github.com/vibtoolshq/vib-mcp/actions/runs/45928147183). All four jobs completed failure solely at the synthetic acceptance step; checkout, setup, preflight, toolchain, frozen install, typecheck, build, staging and tracked integrity steps succeeded. Each job executed 32 tests: 18 pass, 14 fail, 0 skipped/cancelled/todo, exit 1. Total 128 executions, 72 pass, 56 fail; 14 distinct failing tests, identical across environments. No rerun.

| Job ID | Environment | Node | npm | Git | Test result |
| --- | --- | --- | --- | --- | --- |
| 140274270830 | Linux x64 | 20.20.2 | 10.8.2 | 2.56.1 | 18/32 PASS |
| 140274270686 | Linux x64 | 22.23.5 | 10.9.9 | 2.56.1 | 18/32 PASS |
| 140274270358 | Windows x64 | 20.20.2 | 10.8.2 | 2.56.1.windows.1 | 18/32 PASS |
| 140274270666 | Windows x64 | 22.23.5 | 10.9.9 | 2.56.1.windows.1 | 18/32 PASS |

### Reproduced failure register (same test indices per job)

| Test | Gate | Finding | Observed |
| --- | --- | --- | --- |
| 6 | QA-16 | F-08 | Unknown call option: exit 1, expected 2 |
| 7 | QA-16 | F-08 | Blank add name: exit 1, expected 2 |
| 11 | QA-15 | F-07 | Non-HTTP config URL accepted: exit 0, expected 1 |
| 12 | QA-15 | F-07 | Unsafe timer accepted: exit 0, expected 1 |
| 14 | QA-17 | F-06 | Successful concurrent adds lost entries; Linux20 missing s2, Linux22 and Windows22 missing s4; Windows20 also failed |
| 15 | QA-17 | F-06 | Unknown field lost on mutation |
| 17 | QA-25 | F-01 | Short synthetic canary leaked |
| 18 | QA-25 | F-01 | Sensitive endpoint/name canary leaked |
| 20 | QA-26 | F-02 | JSON.parse failed at position 2 after masking structural output |
| 21 | QA-27 | F-03 | Unrelated synthetic environment canary leaked |
| 26 | QA-22 | F-05 | List missing later page |
| 27 | QA-22 | F-05 | Later-page describe returned exit 1 instead of 0; subsequent missing-tool assertion not reached |
| 28 | QA-22 | F-05 | Repeated cursor accepted: exit 0, expected 1 |
| 31 | QA-24 | F-04 | Per-server timeout override assertion failed; test measures elapsed wall time including startup |

All failures are preserved; F-01–08 remain OPEN, not fixed. F-01–03 P0 next priority. F-09 fresh build/standalone evidence and F-10 advisory evidence obtained but not full release closure; F-11 docs and F-12 governance remain open. QA-28 on job 140274270686: runtime and full each exit 0; info/low/moderate/high/critical/total all zero; advisories empty. Other jobs intentionally skip audit. Point-in-time registry evidence, not comprehensive security certification.

### Limitations and next action

No macOS, historical secret scan, interrupted-write fault injection, close-specific fault injection or direct executable-mode qualification. QA-30 tracked integrity and the owned stdio timeout child cleanup assertion passed; not proof of exhaustive leak absence. No real MCP endpoint/credential, PC/VPS workload, release or product source edits. No assertion changes after CI. Main and backup remain at approved baseline; do not merge or sync candidate without separate approval. Next: SEC-01 narrowly fix F-01–03 on separately approved scope based on tested candidate plus this evidence-only checkpoint; retain original 32 tests, add targeted security edge cases, one separately authorized CI run; then F-04, F-05–08 and remaining release gates. Production NO-GO.
