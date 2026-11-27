# SEC-01 / A01 — security acceptance

Candidate recovery from 6b94d77950a8312db56f09ff6a81b593176b2ff8; base 6f1ab6290301272d9fbb4f8305e82f6ee9053496. Previous CI 45928147183: 18/32 pass each of four jobs. Current status NOT RUN; production NO-GO. Original 32 tests unchanged. Expected 22 pass / 10 known non-target failures plus 20/20 focused tests per job. One candidate-only run. No main merge, backup sync or release.

| Gate | Coverage | Outcome |
| --- | --- | --- |
| SEC-01 | short credentials | NOT RUN |
| SEC-02 | overlap | NOT RUN |
| SEC-03 | Bearer component | NOT RUN |
| SEC-04 | env precedence | NOT RUN |
| SEC-05 | URL known values | NOT RUN |
| SEC-06 | servers | NOT RUN |
| SEC-07 | add/remove | NOT RUN |
| SEC-08 | metadata | NOT RUN |
| SEC-09 | call success/error | NOT RUN |
| SEC-10 | partial config/usage failure | NOT RUN |
| SEC-11 | quoted/Unicode | NOT RUN |
| SEC-12 | JSON validity | NOT RUN |
| SEC-13 | fixed keys/types | NOT RUN |
| SEC-14 | dynamic keys/collision | NOT RUN |
| SEC-15 | truncation | NOT RUN |
| SEC-16 | unrelated env | NOT RUN |
| SEC-17 | explicit env | NOT RUN |
| SEC-18 | platform/mixed-case override | NOT RUN |
| SEC-19 | stderr | NOT RUN |
| SEC-20 | artifact/cleanup | NOT RUN |

Pre-CI design review: F-01 known-value collection before validation, F-02 structure-aware JSON and pre-truncation redaction, F-03 SDK defaults plus explicit env, Windows key normalization and stderr suppression. Mixed-case PATH and duplicate key probe strengthened in SEC-18; usage-error canary in SEC-10. Unknown secrets, structural matches and OS sandboxing not guaranteed. Actual SDK behavior, typecheck and all runtime tests pending CI. No claims of complete security certification.
