import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture,cli,result,json,stdioConfig,mockPath} from './helpers.mjs';
import {remote} from './fixtures/mock-mcp.mjs';

async function exercise(f,name){
 assert.ok(json(await cli(f,['ping',name,'--json'])).ok);
 assert.ok(json(await cli(f,['list',name,'--json'])).some(x=>x.name==='echo'));
 const d=json(await cli(f,['describe',name,'echo','--json']));
 assert.equal(d.inputSchema.type,'object');
 const r=json(await cli(f,['call',name,'echo','{"value":"synthetic"}','--json']));
 assert.equal(r.output,'synthetic');
}
test('QA-18 stdio initialize/list/describe/call/ping',async t=>{
 const f=await fixture(t,{local:stdioConfig()});await exercise(f,'local');
});
test('QA-19 Streamable HTTP no-auth and authenticated',async t=>{
 const a=await remote();t.after(()=>a.close());
 const b=await remote({auth:'Bearer QA_SYNTHETIC_SECRET_AUTH'});t.after(()=>b.close());
 const f=await fixture(t,{plain:{type:'http',url:a.http},auth:{type:'http',url:b.http,headers:{Authorization:'Bearer '+'$'+'{QA_TOKEN}'}}});
 await f.env('QA_TOKEN=QA_SYNTHETIC_SECRET_AUTH\n');
 await exercise(f,'plain');await exercise(f,'auth');
 await f.env('QA_TOKEN=QA_SYNTHETIC_SECRET_WRONG\n');
 result(await cli(f,['ping','auth','--timeout','1000']),1);
});
test('QA-20 SSE initialize/list/describe/call/ping',async t=>{
 const m=await remote();t.after(()=>m.close());
 const f=await fixture(t,{legacy:{type:'sse',url:m.sse}});await exercise(f,'legacy');
});
test('QA-21 ping method-not-found fallback',async t=>{
 const m=await remote({fallback:true});t.after(()=>m.close());
 const f=await fixture(t,{local:{type:'http',url:m.http}});
 assert.ok(json(await cli(f,['ping','local','--json'])).ok);
});
test('QA-22 list all pages',async t=>{
 const m=await remote({pages:true});t.after(()=>m.close());
 const f=await fixture(t,{local:{type:'http',url:m.http}});
 assert.deepEqual(json(await cli(f,['list','local','--json'])).map(x=>x.name).sort(),['echo','later']);
});
test('QA-22 describe later page and missing tool',async t=>{
 const m=await remote({pages:true});t.after(()=>m.close());
 const f=await fixture(t,{local:{type:'http',url:m.http}});
 const r=await cli(f,['describe','local','later','--json']);assert.equal(json(r).name,'later');
 result(await cli(f,['describe','local','missing']),1);
});
test('QA-22 repeated cursor bounded rejection',async t=>{
 const m=await remote({pages:true,repeat:true});t.after(()=>m.close());
 const f=await fixture(t,{local:{type:'http',url:m.http}});
 result(await cli(f,['list','local','--timeout','500']),1);
});
test('QA-23 tool errors and bounded output',async t=>{
 const f=await fixture(t,{local:stdioConfig()});
 assert.equal(json(await cli(f,['call','local','fail','--json']),1).error,'hello');
 const r=json(await cli(f,['call','local','large','--max-chars','100','--json']));
 assert.equal(r.truncated,true);assert.equal(r.originalLength,9000);assert.match(r.output,/truncated/);
 const all=json(await cli(f,['call','local','large','--max-chars','0','--json']));
 assert.equal(all.output.length,9000);assert.equal(all.truncated,false);
});
test('QA-24 hanging HTTP call exits within watchdog',async t=>{
 const m=await remote();t.after(()=>m.close());
 const f=await fixture(t,{local:{type:'http',url:m.http}});
 const r=await cli(f,['call','local','hang','--timeout','250'],{deadline:4000});result(r,1);
});
test('QA-24 server override longer than global timeout',async t=>{
 // Mock hangs: a short global timeout must not override a longer per-server timeout.
 const m=await remote();t.after(()=>m.close());
 const f=await fixture(t,{local:{type:'http',url:m.http,timeout:1200}});
 const start=Date.now();result(await cli(f,['call','local','hang','--timeout','100'],{deadline:5000}),1);
 assert.ok(Date.now()-start>=1000,'server timeout override not honored');
});
test('QA-24 stdio child cleanup after timed out call',async t=>{
 const f=await fixture(t);const pidfile=join(f.dir,'pid');
 await f.write({local:stdioConfig({env:{QA_PID_FILE:pidfile}})});
 let pid;
 const alive=()=>{try{process.kill(pid,0);return true}catch(e){if(e.code==='ESRCH')return false;throw e}};
 try{
   const r=await cli(f,['call','local','hang','--timeout','300'],{deadline:6000});
   pid=Number(await readFile(pidfile,'utf8'));assert.ok(Number.isInteger(pid)&&pid>1);
   result(r,1);
   for(let i=0;i<20&&alive();i++)await new Promise(r=>setTimeout(r,100));
   assert.equal(alive(),false,'owned mock child survives CLI exit');
 }finally{if(pid&&alive())process.kill(pid);}
});
