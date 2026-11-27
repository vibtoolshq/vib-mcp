# LIFE-01 — approved scope lock

2026-11-27. Development parent 8adf45cbfd17ee9014524d1114b5e1546a4f878b; tree 661dce7fcf366ebd7dcd1efff51a6f016fef1d75. Canonical main e43fefd1695103ce7f9d353adb2ea3f4060f7376; backup aae15d850211072ee717c4afe4ce1de6e4add9dc; shared main tree 457d0e304b1bcdfff46b9ab4a6bec785aa600e5c. All refs and two prior single-attempt CI runs verified. Owner explicitly accepts SEC-01 targeted security PASS (45932259275), test #14 intermittent result and revised identity-based gate; F-06 stays OPEN. Preserve original evidence. No SEC rerun.

Exact writable paths (21):
- src/client.ts
- tests/lifecycle/life01.test.mjs
- tests/lifecycle/mock-lifecycle.mjs
- tests/lifecycle/preflight.mjs
- .github/workflows/life01-ci.yml
- notes/LIFE-01.md
- notes/README.md
- notes/MANIFEST.md
- project/LIFE-01-EVIDENCE.md
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

F-04 only. Separate connect/operation deadlines, effective server override, supported SDK cancellation, total cleanup budget <=5000 ms, no forced process exit/private SDK internals. Preserve security boundaries, existing 32+20 tests, output/spec/deps. Candidate branch fix/life-01 only, one CI Linux/Windows x Node20/22. Original #31 must pass; known non-target failure set 6,7,11,12,14,15,26,27,28 only; 20 security and 16 lifecycle tests all pass. No post-CI source patch, rerun, merge, backup sync, release or deployment. Stop on drift, unsupported API, infrastructure blocker or unexpected regression. Production NO-GO.
