# LIFE-01 — F-04 lifecycle acceptance

Development parent 8adf45cbfd17ee9014524d1114b5e1546a4f878b / tree 661dce7fcf366ebd7dcd1efff51a6f016fef1d75. Owner accepts SEC-01 targeted security result and intermittent test 14 discrepancy; F-06 remains OPEN; historical evidence preserved. Prior run 45932259275: 170 PASS / 38 known FAIL. Current status NOT RUN; production NO-GO.

Pinned SDK 1.32.2 public upstream tag 1.32.2 commit 3b73021a0a2272c0c04c3917bcdb03398b3ec63f reviewed: Client.connect(transport, RequestOptions), ping/listTools/callTool accept timeout/signal; base start and notification do not. Client.connect can initiate close without awaiting; LifecycleClient joins the same close. SDK stdio close uses EOF, SIGTERM, SIGKILL with two 2000 ms waits; HTTP/SSE close aborts transport I/O. No private SDK API used. Actual installed behavior subject to CI. Exact source scope src/client.ts lifecycle only; SEC-01 transport config unchanged. Separate phase deadlines, maximum 5000 ms cleanup, no forced exit. Cleanup uncertainty is reported; remote effects, arbitrary descendants and event-loop stalls not guaranteed.

| Gate | Coverage | Result |
| --- | --- | --- |
| LIFE-01 | Default/global forwarding | NOT RUN |
| LIFE-02 | Longer override | NOT RUN |
| LIFE-03 | Shorter override | NOT RUN |
| LIFE-04 | HTTP init hang | NOT RUN |
| LIFE-05 | SSE start/init hang | NOT RUN |
| LIFE-06 | Stdio init hang | NOT RUN |
| LIFE-07 | HTTP operation hang | NOT RUN |
| LIFE-08 | SSE operation hang | NOT RUN |
| LIFE-09 | Stdio operation hang | NOT RUN |
| LIFE-10 | Ping fallback budget | NOT RUN |
| LIFE-11 | Client close rejection | NOT RUN |
| LIFE-12 | Client close hang | NOT RUN |
| LIFE-13 | Transport close rejection/hang | NOT RUN |
| LIFE-14 | Abort/timer/owned stubborn child | NOT RUN |
| LIFE-15 | Primary error/redaction/exit | NOT RUN |
| LIFE-16 | Stage/fixture/connection integrity | NOT RUN |

Acceptance: original #31 and all stable prior passing tests pass; only known original failures 6,7,11,12,14,15,26,27,28 allowed (14 intermittent); all 20 SEC and 16 LIFE cases pass per job. One isolated matrix run; full runtime not accepted. Close fault tests invoke real lifecycle helper with synthetic close adapters; actual transport tests run on loopback and owned child. No live credentials, source patch after CI, rerun, release or merge.
