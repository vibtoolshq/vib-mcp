# BASELINE-QA-01 — Acceptance evidence

Status: candidate preparation; all execution gates NOT RUN before CI. Production NO-GO. Main and backup remain read-only. See [scope lock](../notes/BASELINE-QA-01.md) and [original findings](FORENSIC-FINDINGS.md).

Expected source parent: e43fefd1695103ce7f9d353adb2ea3f4060f7376. Expected original tree: 457d0e304b1bcdfff46b9ab4a6bec785aa600e5c. Candidate commit, workflow run and job IDs will be recorded after read-only CI inspection. One run only, no reruns or source fixes. Node 20/22 x Linux/Windows; macOS deferred. Tests use built-in Node runner and harmless local mocks.

| Gate | Requirement | Runtime outcome |
| --- | --- | --- |
| QA-01 | exact candidate scope | NOT RUN |
| QA-02 | immutable source | NOT RUN |
| QA-03 | toolchain | NOT RUN |
| QA-04 | frozen install | NOT RUN |
| QA-05 | typecheck | NOT RUN |
| QA-06 | build | NOT RUN |
| QA-07 | staging layout | NOT RUN |
| QA-08 | standalone execution | NOT RUN |
| QA-09 | help/version | NOT RUN |
| QA-10 | servers | NOT RUN |
| QA-11 | add/upsert | NOT RUN |
| QA-12 | remove | NOT RUN |
| QA-13 | config path | NOT RUN |
| QA-14 | env precedence | NOT RUN |
| QA-15 | validation | NOT RUN |
| QA-16 | CLI contract | NOT RUN |
| QA-17 | config writes | NOT RUN |
| QA-18 | stdio | NOT RUN |
| QA-19 | HTTP | NOT RUN |
| QA-20 | SSE | NOT RUN |
| QA-21 | ping fallback | NOT RUN |
| QA-22 | pagination | NOT RUN |
| QA-23 | tool call/error/truncation | NOT RUN |
| QA-24 | timeout/cleanup | NOT RUN |
| QA-25 | redaction | NOT RUN |
| QA-26 | JSON integrity | NOT RUN |
| QA-27 | stdio trust | NOT RUN |
| QA-28 | advisory scans | NOT RUN |
| QA-29 | artifact safety | NOT RUN |
| QA-30 | cleanup/integrity | NOT RUN |

Contract failures must remain failures; evidence collection is distinct from runtime acceptance. Any unexecuted subcase (including fault injection, historical secret scan, direct executable mode or close-specific fault injection if not measured) remains NOT RUN, not PASS. No real credentials, external tool calls, publication or release. Evidence follow-up is Markdown-only and must not trigger workflow.
