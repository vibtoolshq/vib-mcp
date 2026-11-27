import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, readdir, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stage = join(root, 'dist', '.vib-mcp');
export const mockPath = join(root, 'tests', 'baseline', 'fixtures', 'mock-mcp.mjs');
export const safeEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) =>
  /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LANG|LC_ALL)$/i.test(k)));
export async function fixture(t, servers = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'vib-qa-'));
  const app = join(dir, '.vib-mcp');
  await mkdir(app);
  const bundle = join(app, 'vib-mcp.mjs');
  await copyFile(join(stage, 'vib-mcp.mjs'), bundle);
  const config = join(app, 'servers.json');
  await writeFile(config, JSON.stringify({servers}));
  t.after(async () => {
    await rm(dir, {recursive:true, force:true, maxRetries:3, retryDelay:100});
    await assert.rejects(lstat(dir), {code:'ENOENT'});
  });
  return {dir, app, bundle, config, write: async s => writeFile(config, JSON.stringify({servers:s})),
    read: async () => JSON.parse(await readFile(config,'utf8')),
    env: async text => writeFile(join(app,'.env'),text)};
}
export function cli(f, args, options={}) {
  return new Promise((resolveResult,reject) => {
    const child=spawn(process.execPath,[f.bundle,...args],{cwd:options.cwd??f.dir,env:{...safeEnv(),...options.env},stdio:['ignore','pipe','pipe'],windowsHide:true});
    let stdout='',stderr='',timedOut=false,tooLarge=false;
    const capture=(key,chunk)=>{
      if(key==='stdout') stdout+=chunk; else stderr+=chunk;
      if(stdout.length+stderr.length>1024*1024){tooLarge=true;child.kill();}
    };
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',c=>capture('stdout',c));child.stderr.on('data',c=>capture('stderr',c));
    const timer=setTimeout(()=>{timedOut=true;child.kill();},options.deadline??8000);
    child.once('error',e=>{clearTimeout(timer);reject(e)});
    child.once('close',(code,signal)=>{clearTimeout(timer);resolveResult({code,signal,stdout,stderr,timedOut,tooLarge})});
  });
}
export function result(r, code=0) {
  assert.equal(r.timedOut,false,'CLI exceeded outer watchdog');
  assert.equal(r.tooLarge,false,'CLI exceeded capture cap');
  assert.equal(r.code,code,'unexpected exit code');
  if(code===0) assert.equal(r.stderr,'','unexpected stderr');
  return r;
}
export function json(r,code=0) {
  result(r,code);
  return JSON.parse(code===0?r.stdout:r.stderr);
}
export function noCanary(r, ...values) {
  for(const value of values) {
    assert.ok(!r.stdout.includes(value) && !r.stderr.includes(value),'synthetic canary leaked');
  }
}
export function stdioConfig(extra={}) {
  return {type:'stdio',command:process.execPath,args:[mockPath,'stdio'],...extra};
}
export async function stageCheck(){
  const names=(await readdir(stage)).sort();
  assert.deepEqual(names,['.env.example','servers.json','vib-mcp.mjs']);
  for(const name of names) assert.ok((await lstat(join(stage,name))).isFile());
  for(const name of ['servers.json','.env.example']) assert.deepEqual(await readFile(join(stage,name)),await readFile(join(root,'templates',name)));
  const bundle=await readFile(join(stage,'vib-mcp.mjs'),'utf8');
  assert.ok(bundle.startsWith('#!/usr/bin/env node\n'));
  assert.equal((bundle.match(/^#!/gm)||[]).length,1);
  assert.ok(!bundle.includes('QA_SYNTHETIC_SECRET_'));
}
const runGit=(args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:2*1024*1024});assert.equal(r.status,0,'git failed');return r.stdout.trim()};
export function preflight(){
  const baseline='e43fefd1695103ce7f9d353adb2ea3f4060f7376';
  const allow=['.github/workflows/baseline-qa-01.yml','tests/baseline/cli.test.mjs','tests/baseline/config.test.mjs','tests/baseline/transport.test.mjs','tests/baseline/security.test.mjs','tests/baseline/helpers.mjs','tests/baseline/fixtures/mock-mcp.mjs','notes/BASELINE-QA-01.md','notes/README.md','notes/MANIFEST.md','project/BASELINE-QA-01-EVIDENCE.md','project/README.md','project/MANIFEST.md'].sort();
  assert.equal(runGit(['rev-parse',baseline+'^{tree}']),'457d0e304b1bcdfff46b9ab4a6bec785aa600e5c');
  assert.equal(runGit(['rev-parse','HEAD^']),baseline);
  assert.deepEqual(runGit(['diff','--name-only',baseline,'HEAD']).split('\n').sort(),allow);
  assert.equal(runGit(['diff','--name-only',baseline,'HEAD','--','src','package.json','package-lock.json','build.mjs','templates','tsconfig.json','project/SPEC.md','release']),'');
  console.log('QA-01 PASS exact candidate scope; QA-02 PASS immutable source; SHA='+runGit(['rev-parse','HEAD']));
}
export function integrity(){
  assert.equal(runGit(['status','--porcelain','--untracked-files=all']),'');
  assert.equal(runGit(['diff','--name-only','HEAD']),'');
  console.log('QA-30 PASS tracked worktree integrity (fixture cleanup separately asserted)');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv[2]==='preflight')preflight();
  else if(process.argv[2]==='stage') {await stageCheck();console.log('QA-07/29 PASS stage allowlist/templates/shebang');}
  else if(process.argv[2]==='integrity')integrity();
  else if(process.argv[2]==='audit'){
    const mode=process.argv[3];assert.ok(['runtime','full'].includes(mode));
    const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['audit',...(mode==='runtime'?['--omit=dev']:[]),'--json'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,timeout:90000});
    let report;try{report=JSON.parse(r.stdout)}catch{}
    if(!report?.metadata?.vulnerabilities||report.error||r.error){console.log('QA-28 BLOCKED '+mode+' audit unavailable; exit='+r.status);process.exitCode=2;}
    else {console.log(JSON.stringify({gate:'QA-28',mode,exit:r.status,counts:report.metadata.vulnerabilities,advisories:Object.entries(report.vulnerabilities??{}).map(([name,v])=>({name,severity:v.severity,range:v.range,via:v.via.map(x=>typeof x==='string'?x:{source:x.source,title:x.title,url:x.url,severity:x.severity})}))}));process.exitCode=r.status??2;}
  } else throw Error('unknown helper command');
}
