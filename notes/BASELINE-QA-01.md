# BASELINE-QA-01 — Scope lock

Approved 2026-11-27. Canonical main e43fefd1695103ce7f9d353adb2ea3f4060f7376; backup main aae15d850211072ee717c4afe4ce1de6e4add9dc; shared tree 457d0e304b1bcdfff46b9ab4a6bec785aa600e5c. Preflight confirmed 39 recursive entries, 33 blobs, both main refs unchanged, candidate branch absent.

Exact writable paths (13):
- .github/workflows/baseline-qa-01.yml
- tests/baseline/cli.test.mjs
- tests/baseline/config.test.mjs
- tests/baseline/transport.test.mjs
- tests/baseline/security.test.mjs
- tests/baseline/helpers.mjs
- tests/baseline/fixtures/mock-mcp.mjs
- notes/BASELINE-QA-01.md
- notes/README.md
- notes/MANIFEST.md
- project/BASELINE-QA-01-EVIDENCE.md
- project/README.md
- project/MANIFEST.md

All other files read-only. One candidate-only push-triggered workflow (Linux/Windows, Node 20/22); no automatic rerun, no main merge or backup sync. Test only synthetic loopback and stdio fixtures, no real secrets/live calls, no new dependencies, no source fixes. No production changes, release, tag or publish. Preserve all failures and evidence; stop on baseline drift, unauthorized changes or infrastructure blocker. Evidence-only Markdown follow-up must not trigger CI. See project/BASELINE-QA-01-EVIDENCE.md. Production NO-GO.
