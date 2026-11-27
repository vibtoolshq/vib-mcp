# Release Structure and Rules

This document governs versioned portable artifacts. The current build output
is staged under `dist/.vib-mcp/`; no versioned release is created until the
forensic audit and bug-fix pass is complete and a release is explicitly
authorized.

## Release Folder Structure

Each release is a versioned snapshot under `release/<version>/`. The only
published files are the portable bundle and its safe configuration templates:

```text
release/
├── v1.0.0/
│   └── .vib-mcp/
│       ├── vib-mcp.mjs
│       ├── servers.json
│       └── .env.example
└── v1.1.1/
    └── .vib-mcp/
        ├── vib-mcp.mjs
        ├── servers.json
        └── .env.example
```

The version directories above illustrate the required layout. Do not create
them until the release gate has been satisfied.

## Strict Release Rules

- **No premature release:** Do not create `release/` or any versioned release
  artifact before the full forensic audit and bug-fix pass is complete and
  release creation is explicitly authorized.
- **Semantic versioning:** Name each version directory `vMAJOR.MINOR.PATCH`.
  Never overwrite or modify an existing version folder after publication.
- **Mandatory pre-release gate:** All of these checks must pass before a
  release is created:
  1. `npm run typecheck` completes with zero errors.
  2. `npm run build` succeeds cleanly.
  3. The full forensic audit and bug-fix verification are complete.
  4. The bundle is tested outside `node_modules/` with `--help`, `--version`,
     `servers`, `add`, `remove`, and live or mock MCP calls.
  5. The release contents are confirmed to contain no `.env` or other secret
     files, and no real tokens.
- **Portable contents only:** Include exactly `.vib-mcp/vib-mcp.mjs`,
  `.vib-mcp/servers.json`, and `.vib-mcp/.env.example`. Do not include source,
  `node_modules/`, real `.env` files, logs, or unrelated files.
- **Never stage or publish secrets:** `servers.json` may contain environment
  placeholders, but credentials belong only in the consumer's ignored
  `.vib-mcp/.env` or process environment. Never copy a populated `.env` or
  real token into `dist/` or `release/`.
- **Keep versions immutable:** Never replace the contents of an existing
  version directory. Use a new version directory for a new release.
- **Preserve layout:** The bundle and both configuration files must be inside
  the `.vib-mcp/` directory at the root of each version directory.
- **Keep staging separate:** `dist/.vib-mcp/` is build output, not a release.
  The build command must not create or modify any files under `release/`.
- **No automatic release creation:** Normal development and build commands
  must never create or populate `release/vX.Y.Z/`. Create release folders only
  after the gate above and explicit user authorization.

## Release Gate

Before a release is cut, record completion of the forensic review, resolve
confirmed defects, satisfy every pre-release gate above, inspect the portable
contents for accidental secrets or dependencies, and obtain explicit
authorization to create the versioned artifact. Until then, changes remain in
the source tree and `dist/` only.
