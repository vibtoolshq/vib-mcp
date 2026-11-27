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
