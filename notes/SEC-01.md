# SEC-01 — approved scope lock

2026-11-27. Base 6f1ab6290301272d9fbb4f8305e82f6ee9053496; tree 1adc1bc58aa4afc744d96309d9b8e0155287314f. Canonical main e43fefd1695103ce7f9d353adb2ea3f4060f7376; backup aae15d850211072ee717c4afe4ce1de6e4add9dc. Previous CI 45928147183 attempt 1 failure; 18/32 pass per job. Preflight verified refs; fix/sec-01 absent.

Exact allowed paths (23):
- src/config.ts
- src/cli.ts
- src/client.ts
- tests/security/sec01.test.mjs
- tests/security/mock-security.mjs
- tests/security/preflight.mjs
- .github/workflows/sec01-ci.yml
- notes/SEC-01.md
- notes/README.md
- notes/MANIFEST.md
- project/SEC-01-EVIDENCE.md
- project/README.md
- project/MANIFEST.md
- project/blueprint/README.md
- project/blueprint/MANIFEST.md
- project/blueprint/files.md
- project/blueprint/modules.md
- project/blueprint/functions.md
- project/blueprint/data-flow.md
- docs/README.md
- docs/MANIFEST.md
- docs/cli-commands.md
- docs/configuration.md

Only F-01 credential collection/redaction, F-02 structured output sanitization, F-03 stdio env/stderr boundary. All other behavior and files read-only. Original tests byte-identical. One candidate-only CI (Linux/Windows × Node 20/22), no rerun, no source edits after CI, no main merge or backup sync, no live secrets/services, release/deployment. Expected original 22 PASS and 10 known non-target failures; preserve actual results. Stop on drift or unexpected regression. Production NO-GO.

## A01 recovery — 2026-11-27

Reverified approved refs, prior CI attempt, prepared tree 6b94d77950a8312db56f09ff6a81b593176b2ff8 and all seven changed blobs; 39 original files unchanged. No SEC-01 branch/run. Continue original 23-path scope, complete documentation/workflow and focused pre-CI review; first and only SEC-01 run. No main/backup mutations.

## A01 terminal checkpoint — 2026-11-27

Candidate 11e1e296f99f11674a4874cb78f9f4fa9f9e6d08; tree fa1429b1427f6ae587d114972a49908e212dd4fb. Exact 23 paths verified; original tests/dependencies/spec unchanged. Run 45932259275 attempt 1 terminal failure solely on original known non-target cases. All four jobs frozen install/typecheck/build/staging/integrity PASS. Original 90/128 PASS, focused 80/80 PASS; 170/208 PASS total; all 16 targeted original security executions PASS and no new regression. Exact 22/32 per job not met: Linux22 and Windows20 passed 23/32 (known concurrent add race test 14 passed intermittently, F-06 remains OPEN). SEC-01_TARGET_ACCEPTANCE_PASS; EXACT_COUNT_GATE_NOT_MET; formal closure pending owner reconciliation. See project/SEC-01-EVIDENCE.md for job IDs and exact failure sets. No source patch or rerun; evidence-only follow-up. No main merge or backup sync. Full runtime FAIL; production NO-GO.
