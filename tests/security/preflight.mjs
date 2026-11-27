import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(r.status,0,'git command failed');return r.stdout.trim()};
const base='6f1ab6290301272d9fbb4f8305e82f6ee9053496';
const allowed=['src/config.ts','src/cli.ts','src/client.ts','tests/security/sec01.test.mjs','tests/security/mock-security.mjs','tests/security/preflight.mjs','.github/workflows/sec01-ci.yml','notes/SEC-01.md','notes/README.md','notes/MANIFEST.md','project/SEC-01-EVIDENCE.md','project/README.md','project/MANIFEST.md','project/blueprint/README.md','project/blueprint/MANIFEST.md','project/blueprint/files.md','project/blueprint/modules.md','project/blueprint/functions.md','project/blueprint/data-flow.md','docs/README.md','docs/MANIFEST.md','docs/cli-commands.md','docs/configuration.md'];
assert.equal(git('rev-parse','HEAD^'),base);assert.equal(git('rev-parse',base+'^{tree}'),'1adc1bc58aa4afc744d96309d9b8e0155287314f');
const changed=git('diff','--name-only',base,'HEAD').split('\n');assert.ok(changed.every(x=>allowed.includes(x)));assert.equal(git('diff','--name-only',base,'HEAD','--','tests/baseline','package.json','package-lock.json','build.mjs','templates','project/SPEC.md','release'),'');
console.log('SEC scope PASS; original tests/lock/spec unchanged; SHA='+git('rev-parse','HEAD'));
