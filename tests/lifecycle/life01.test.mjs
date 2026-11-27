import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import {fixture,cli,result,json,noCanary,stdioConfig,stageCheck} from '../baseline/helpers.mjs';
import {remote,never} from './mock-lifecycle.mjs';
import {withMcpClient,withTimeout,closeBounded} from '../../src/client.ts';
const mock=fileURLToPath(new URL('./mock-lifecycle.mjs',import.meta.url));
async function setup(t,kind,opt={},timeout){
 const m=await remote(opt);t.after(()=>m.close());
 const cfg={type:kind,url:m[kind],...(timeout===undefined?{}:{timeout})};
 return {m,cfg,f:await fixture(t,{local:cfg})};
}
async function eventually(fn,description,ms=1800){const end=performance.now()+ms;while(!fn()&&performance.now()<end)await sleep(25);assert.ok(fn(),description);}
async function run(f,args,code=0,deadline=8000){return result(await cli(f,[...args,'--json'],{deadline}),code);}
async function hanging(t,kind,opt,command,seen){
 const {m,f}=await setup(t,kind,opt);
 const r=await run(f,[...command,'--timeout','300'],1);
 assert.match(JSON.parse(r.stderr).error,/timed out|timeout/i);assert.ok(m.seen.includes(seen),'fixture phase not reached');
 await eventually(()=>m.active()===0,'active response/stream leaked');await eventually(()=>m.sockets()===0,'owned sockets leaked');
}
async function child(t,hang,stubborn=false){
 const f=await fixture(t);const pidfile=join(f.dir,'pid');let pid;
 const alive=()=>{if(!pid)return false;try{process.kill(pid,0);return true}catch(e){if(e.code==='ESRCH')return false;throw e;}};
 try{
  await f.write({local:stdioConfig({args:[mock,'stdio',hang,...(stubborn?['stubborn']:[])],env:{LIFE_PID_FILE:pidfile}})});
  const r=await cli(f,[...(hang==='initialize'?['ping','local']:['call','local','echo']),'--timeout','300','--json'],{deadline:8000});
  pid=Number(await readFile(pidfile,'utf8'));assert.ok(Number.isInteger(pid)&&pid>1);result(r,1);assert.match(JSON.parse(r.stderr).error,/timed out|timeout/i);
  await eventually(()=>!alive(),'owned stdio child survived');
 }finally{if(pid&&alive())process.kill(pid,'SIGKILL');}
}
test('LIFE-01 default and global request options',async t=>{
 const {cfg}=await setup(t,'http');
 for(const timeout of [30000,1500]){
  await withMcpClient(cfg,timeout,[],async(client,options)=>{assert.equal(options.timeout,timeout);assert.ok(options.signal instanceof AbortSignal);assert.equal(options.signal.aborted,false);await client.ping(options);});
 }
});
test('LIFE-02 longer server timeout overrides global',async t=>{
 const {f,m}=await setup(t,'http',{delay:{'tools/call':350}},1500);
 const r=await run(f,['call','local','echo','--timeout','100']);assert.equal(JSON.parse(r.stdout).output,'ok');assert.ok(m.seen.includes('tools/call'));
});
test('LIFE-03 shorter server timeout overrides global',async t=>{
 const {f,m}=await setup(t,'http',{hang:'tools/call'},300);
 const r=await run(f,['call','local','echo','--timeout','30000'],1,5000);assert.match(JSON.parse(r.stderr).error,/timed out|timeout/i);assert.ok(m.seen.includes('tools/call'));
});
test('LIFE-04 hanging HTTP initialization',async t=>hanging(t,'http',{hang:'initialize'},['ping','local'],'initialize'));
test('LIFE-05 hanging SSE start and initialization',async t=>{
 await hanging(t,'sse',{hangStart:true},['ping','local'],'sse-open');
 await hanging(t,'sse',{hang:'initialize'},['ping','local'],'initialize');
});
test('LIFE-06 hanging stdio initialization',async t=>child(t,'initialize'));
test('LIFE-07 hanging HTTP operation',async t=>hanging(t,'http',{hang:'tools/call'},['call','local','echo'],'tools/call'));
test('LIFE-08 hanging SSE operation',async t=>hanging(t,'sse',{hang:'tools/call'},['call','local','echo'],'tools/call'));
test('LIFE-09 hanging stdio operation',async t=>child(t,'tools/call'));
test('LIFE-10 ping fallback shares operation deadline',async t=>{
 const {m,f}=await setup(t,'http',{fallback:true,delay:{ping:500,'tools/list':500}});
 const r=await run(f,['ping','local','--timeout','800'],1);assert.match(JSON.parse(r.stderr).error,/timed out|timeout/i);assert.ok(m.seen.includes('ping')&&m.seen.includes('tools/list'));
});
test('LIFE-11 rejected client close invokes transport fallback',async()=>{
 const order=[];await closeBounded(async()=>{order.push('client');throw Error('synthetic close rejection')},async()=>{order.push('transport')},400);assert.deepEqual(order,['client','transport']);
});
test('LIFE-12 hung client close bounded and fallback attempted',async()=>{
 const order=[];const start=performance.now();await assert.rejects(closeBounded(()=>{order.push('client');return never()},async()=>{order.push('transport')},400),/completion unconfirmed/);assert.deepEqual(order,['client','transport']);assert.ok(performance.now()-start<1500);
});
test('LIFE-13 failed and hung transport fallback are errors',async()=>{
 for(const fallback of [async()=>{throw Error('synthetic transport rejection')},never]){
  const start=performance.now();await assert.rejects(closeBounded(async()=>{throw Error('synthetic client rejection')},fallback,300),/transport cleanup failed or timed out/);assert.ok(performance.now()-start<1500);
 }
});
test('LIFE-14 cancellation signal, deadline timer and stubborn owned child',async t=>{
 let signal;let late=false;await assert.rejects(withTimeout(({signal:s})=>{signal=s;return new Promise(resolve=>s.addEventListener('abort',()=>{late=true;resolve('late')},{once:true}))},50),/timed out/);assert.ok(signal.aborted&&late);
 let okSignal;assert.equal(await withTimeout(async({signal:s})=>{okSignal=s;return 7},60),7);await sleep(100);assert.equal(okSignal.aborted,false,'successful deadline timer remained active');
 await child(t,'tools/call',true);
});
test('LIFE-15 primary error and redacted JSON exit contract',async t=>{
 const v='LIFE_SYNTHETIC_ERROR_VALUE';const {f,cfg}=await setup(t,'http',{error:v});
 await f.write({local:{...cfg,headers:{Authorization:'Bearer '+v}}});
 const r=await run(f,['call','local','echo','--timeout','1500'],1);noCanary(r,v);assert.equal(typeof JSON.parse(r.stderr).error,'string');
 await assert.rejects(withMcpClient(cfg,1500,[v],async()=>{throw Error('primary '+v)}),e=>e.message.includes('primary')&&!e.message.includes(v));
});
test('LIFE-16 artifact, successful transport cleanup and fixture integrity',async t=>{
 await stageCheck();const {m,f}=await setup(t,'sse');const r=await run(f,['ping','local','--timeout','1500']);assert.equal(JSON.parse(r.stdout).ok,true);await eventually(()=>m.active()===0,'successful SSE stream leaked');await eventually(()=>m.sockets()===0,'successful SSE socket leaked');
});
