import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(r.status,0,'git failed');return r.stdout.trim()};
const base='8adf45cbfd17ee9014524d1114b5e1546a4f878b';
const allowed=[".github/workflows/life01-ci.yml","docs/MANIFEST.md","docs/README.md","docs/cli-commands.md","docs/configuration.md","notes/LIFE-01.md","notes/MANIFEST.md","notes/README.md","project/LIFE-01-EVIDENCE.md","project/MANIFEST.md","project/README.md","project/blueprint/MANIFEST.md","project/blueprint/README.md","project/blueprint/data-flow.md","project/blueprint/files.md","project/blueprint/functions.md","project/blueprint/modules.md","src/client.ts","tests/lifecycle/life01.test.mjs","tests/lifecycle/mock-lifecycle.mjs","tests/lifecycle/preflight.mjs"];
assert.equal(git('rev-parse','HEAD^'),base);assert.equal(git('rev-parse',base+'^{tree}'),'661dce7fcf366ebd7dcd1efff51a6f016fef1d75');
assert.deepEqual(git('diff','--name-only',base,'HEAD').split('\n').sort(),allowed);
assert.equal(git('diff','--name-only',base,'HEAD','--','tests/baseline','tests/security','src/config.ts','src/cli.ts','src/types.ts','package.json','package-lock.json','project/SPEC.md','release'),'');
console.log('LIFE scope PASS; immutable original/security tests and dependencies; SHA='+git('rev-parse','HEAD'));
