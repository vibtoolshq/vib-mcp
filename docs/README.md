# docs/

End-user documentation for `vib-mcp-client`. This folder is committed to git
and contains the complete A-Z user guide: how to install, configure, and use
every feature — what each thing is for, why, where, when, and how.

## Contents

| File / Folder | Purpose |
| ------------- | ------- |
| `cli-commands.md` | Exact reference for every CLI command, flag, output mode, and exit code. |
| `configuration.md` | `servers.json` and `.env` formats, transports, and auth. |
| `README.md` | This file. |
| `MANIFEST.md` | Index of every doc with status. |

## Rules

- Every feature must be documented here: what it is, why it exists, where it
  lives, when to use it, and exactly how to use it.
- **No guessing:** every detail must be real and verified against the code or
  `project/SPEC.md`. Never state something assumed or unverified.
- Update docs **in the same change** as the code they describe.
- User-facing behavior changes require updating `project/SPEC.md` first, then
  the matching doc here.
- Do not include secrets, tokens, or real `.env` values.

See `MANIFEST.md` for the index.

SEC-01 candidate security boundaries: see `configuration.md` for explicit stdio environment forwarding and `cli-commands.md` for known-credential redaction. Runtime evidence: [SEC-01](../project/SEC-01-EVIDENCE.md).
