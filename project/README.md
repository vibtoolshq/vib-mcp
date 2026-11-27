# project/

All project-level development documentation for `vib-mcp-client`. This folder
is committed to git and holds the A-Z development record: purpose, locked
contract, architecture blueprint, planning, feature details, and change logs.

## Contents

| File / Folder | Purpose |
| ------------- | ------- |
| `MISSION.md` | Project identity, mission, boundaries, workflow, and engineering guardrails. Read before architectural changes (mandatory per `AGENTS.md`). |
| `SPEC.md` | The locked user-facing contract: configuration, CLI commands, flags, security, and exit codes. Read before any behavioral change (mandatory per `AGENTS.md`). |
| `RELEASE.md` | Release folder structure, versioning rules, and the pre-release gate. Read before release-related work (mandatory per `AGENTS.md`). |
| `blueprint/` | Deep internal map: every module, file, function, where logic lives, what each file is for, and how pieces connect. |
| `README.md` | This file. |
| `MANIFEST.md` | Index of every file/folder in `project/` with phase/status. |

## Rules

- This folder stays in git. Keep it complete and accurate at all times.
- Every code change, update, fix, or feature must be documented here **in the
  same change**: what changed, which files, which phase/step, and when.
- Each feature/page/module must have detailed markdown here, updated together
  with the code.
- Keep step/phase logs for every update/fix; record when and what was
  implemented.
- `SPEC.md` is the locked contract: update it deliberately **before** changing
  user-facing behavior.
- Do not store secrets, tokens, or `.env` values here.

See `MANIFEST.md` for the full index.
