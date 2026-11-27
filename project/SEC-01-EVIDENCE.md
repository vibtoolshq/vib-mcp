# SEC-01 / A01 — security acceptance

Candidate recovery from 6b94d77950a8312db56f09ff6a81b593176b2ff8; base 6f1ab6290301272d9fbb4f8305e82f6ee9053496. Previous CI 45928147183: 18/32 pass each of four jobs. Current status: targeted security acceptance PASS; exact per-job failure-count gate not met; formal closure pending owner reconciliation; production NO-GO. Original 32 tests unchanged. Expected 22 pass / 10 known non-target failures plus 20/20 focused tests per job. One candidate-only run. No main merge, backup sync or release.

| Gate | Coverage | Outcome |
| --- | --- | --- |
| SEC-01 | short credentials | PASS (4/4) |
| SEC-02 | overlap | PASS (4/4) |
| SEC-03 | Bearer component | PASS (4/4) |
| SEC-04 | env precedence | PASS (4/4) |
| SEC-05 | URL known values | PASS (4/4) |
| SEC-06 | servers | PASS (4/4) |
| SEC-07 | add/remove | PASS (4/4) |
| SEC-08 | metadata | PASS (4/4) |
| SEC-09 | call success/error | PASS (4/4) |
| SEC-10 | partial config/usage failure | PASS (4/4) |
| SEC-11 | quoted/Unicode | PASS (4/4) |
| SEC-12 | JSON validity | PASS (4/4) |
| SEC-13 | fixed keys/types | PASS (4/4) |
| SEC-14 | dynamic keys/collision | PASS (4/4) |
| SEC-15 | truncation | PASS (4/4) |
| SEC-16 | unrelated env | PASS (4/4) |
| SEC-17 | explicit env | PASS (4/4) |
| SEC-18 | platform/mixed-case override | PASS (4/4) |
| SEC-19 | stderr | PASS (4/4) |
| SEC-20 | artifact/cleanup | PASS (4/4) |

Pre-CI design review: F-01 known-value collection before validation, F-02 structure-aware JSON and pre-truncation redaction, F-03 SDK defaults plus explicit env, Windows key normalization and stderr suppression. Mixed-case PATH and duplicate key probe strengthened in SEC-18; usage-error canary in SEC-10. Unknown secrets, structural matches and OS sandboxing not guaranteed. SDK behavior, typecheck and runtime outcomes verified for executed cases below. No claims of complete security certification.

## Terminal CI acceptance — 2026-11-27 UTC

Tested commit 11e1e296f99f11674a4874cb78f9f4fa9f9e6d08; tree fa1429b1427f6ae587d114972a49908e212dd4fb. [Run 45932259275](https://github.com/vibtoolshq/vib-mcp/actions/runs/45932259275), attempt 1, completed FAILURE due solely to known original non-target failures. Exactly one SEC-01 run. All four scope preflight, frozen npm ci, typecheck, build, staging allowlist, focused security and tracked integrity steps succeeded.

| Job | Environment | Node | Original PASS/FAIL | Focused PASS/FAIL | Original failing test indices |
| --- | --- | --- | --- | --- | --- | --- |
| 140287319524 | Linux x64 | 20.20.2 | 22/10 | 20/0 | 6,7,11,12,14,15,26,27,28,31 |
| 140287319737 | Linux x64 | 22.23.5 | 23/9 | 20/0 | 6,7,11,12,15,26,27,28,31 |
| 140287319849 | Windows x64 | 20.20.2 | 23/9 | 20/0 | 6,7,11,12,15,26,27,28,31 |
| 140287319830 | Windows x64 | 22.23.5 | 22/10 | 20/0 | 6,7,11,12,14,15,26,27,28,31 |

Total original 128: 90 PASS / 38 FAIL; focused 80: 80 PASS / 0 FAIL; combined 208: 170 PASS / 38 FAIL; zero skipped, cancelled or todo. Original previous passing 18 cases per job retained (72/72); original security indices 17,18,20,21 pass all four (16/16). F-01 (8/8), F-02 (4/4), F-03 (4/4) targeted original acceptance PASS. New SEC-01–20 all pass on all four jobs, including Windows mixed-case PATH override/single-key and child stderr boundary. QA-30 tracked worktree integrity PASS; fixture cleanup asserted in focused tests; this does not prove exhaustive process-leak absence.

### Remaining non-target findings and exact-count deviation

| Finding | Original indices | Failed executions | Status |
| --- | --- | --- | --- |
| F-04 lifecycle | 31 | 4/4 | OPEN |
| F-05 pagination | 26,27,28 | 12/12 | OPEN |
| F-06 configuration | 14,15 | 6/8 | OPEN |
| F-07 validation | 11,12 | 8/8 | OPEN |
| F-08 usage | 6,7 | 8/8 | OPEN |

Test 14 (concurrent independent adds) passed in Linux22 and Windows20, failed in Linux20 and Windows22. Compatible with timing-dependent race; no claim of F-06 fix. All failures are from the historical non-target set, no new failures. Strict approved per-job exact 22 PASS / 10 FAIL count differs in two jobs; no waiver implied. SEC-01_TARGET_ACCEPTANCE_PASS for executed security cases; EXACT_COUNT_GATE_NOT_MET; formal closure/next phase requires owner reconciliation of this discrepancy. Full runtime FAIL; production NO-GO. F-09–F-12 remain open per prior evidence. Known-value redaction and environment isolation are not universal secret detection or OS sandbox guarantees. No macOS/historical scan or new dependency advisory audit performed in this phase; lock unchanged. No source edits after CI, no rerun, no main merge or backup sync, no deployment/tag/release. Canonical main e43fefd1695103ce7f9d353adb2ea3f4060f7376 and backup aae15d850211072ee717c4afe4ce1de6e4add9dc reverified unchanged before evidence write.
