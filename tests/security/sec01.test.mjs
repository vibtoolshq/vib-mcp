import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {fixture,cli,result,json,noCanary,stdioConfig,stageCheck} from '../baseline/helpers.mjs';
import {remote} from '../baseline/fixtures/mock-mcp.mjs';
const mock=fileURLToPath(new URL('./mock-security.mjs',import.meta.url));
const local=(env={},mode='normal')=>stdioConfig({args:[mock,mode],env});
const ref=(name)=>'$'+'{'+name+'}';
const call=(f,value,args=[],opt={})=>cli(f,['call','local','echo',JSON.stringify({value}),...args],opt);
const secretCfg=(value,mode='normal')=>({local:local({SEC_CANARY:value},mode)});
test('SEC-01 short canaries 1–3 characters',async t=>{
 for(const v of ['~','~!','~!@']){
  const f=await fixture(t,secretCfg(v));const r=await call(f,v);result(r);noCanary(r,v);
 }
});
test('SEC-02 overlapping known secrets',async t=>{
 const a='SEC_LONG_OVERLAP',b='SEC_LONG';const f=await fixture(t,{local:local({SEC_CANARY:a,SEC_SECOND:b})});
 const r=await call(f,a+' '+b);result(r);noCanary(r,a,b);
});
test('SEC-03 Bearer component in listing path',async t=>{
 const v='SEC_BEARER_COMPONENT';const f=await fixture(t,{remote:{type:'http',url:'http://127.0.0.1:1/'+v,headers:{Authorization:'Bearer '+v}}});
 const r=await cli(f,['servers','--json']);result(r);noCanary(r,v);assert.equal(JSON.parse(r.stdout)[0].type,'http');
});
test('SEC-04 dotenv interpolation precedence and explicit value',async t=>{
 const v='SEC_DOTENV_VALUE';const f=await fixture(t,secretCfg(ref('SEC_TOKEN')));
 await f.env('SEC_TOKEN='+v+'\n');const r=await call(f,v,['--json'],{env:{SEC_TOKEN:'WRONG_TEST_VALUE'}});result(r);noCanary(r,v);assert.equal(typeof JSON.parse(r.stdout).output,'string');
});
test('SEC-05 URL userinfo sensitive query and known encoded path',async t=>{
 const v='SEC path/value';const f=await fixture(t,{remote:{type:'http',url:'http://sec-user:sec-pass@127.0.0.1:1/'+encodeURIComponent(v)+'?token='+encodeURIComponent(v),headers:{Authorization:'Bearer '+v}}});
 const r=await cli(f,['servers','--json']);result(r);noCanary(r,v,encodeURIComponent(v),'sec-user','sec-pass');JSON.parse(r.stdout);
});
test('SEC-06 listing text and JSON',async t=>{
 const v='SEC_LIST_NAME';const f=await fixture(t,{[v]:local({SEC_CANARY:v})});
 for(const args of [['servers'],['servers','--json']]){const r=await cli(f,args);result(r);noCanary(r,v);if(args.includes('--json'))JSON.parse(r.stdout);}
});
test('SEC-07 add/remove and missing remove output',async t=>{
 const v='SEC_MUTATION_NAME';const f=await fixture(t);await f.env('SEC_TOKEN='+v+'\n');
 for(const args of [['add',v,'http://127.0.0.1:1','--json'],['remove',v,'--json']]){const r=await cli(f,args);result(r);noCanary(r,v);JSON.parse(r.stdout);}
 const r=await cli(f,['remove',v,'--json']);result(r,1);noCanary(r,v);JSON.parse(r.stderr);
});
test('SEC-08 list describe ping metadata redacted',async t=>{
 const v='SEC_METADATA_SECRET';const f=await fixture(t,secretCfg(v,'metadata'));
 for(const args of [['list','local','--json'],['describe','local','echo'],['ping','local','--json']]){const r=await cli(f,args);result(r);noCanary(r,v);JSON.parse(r.stdout);}
});
test('SEC-09 call success and tool error',async t=>{
 const v='SEC_TOOL_SECRET';const f=await fixture(t,secretCfg(v));
 for(const [tool,code] of [['echo',0],['fail',1]]){
 const r=await cli(f,['call','local',tool,JSON.stringify({value:v}),'--json']);result(r,code);noCanary(r,v);JSON.parse(code?r.stderr:r.stdout);}
});
test('SEC-10 partial interpolation and validation failure',async t=>{
 const v='SEC_PARTIAL_SECRET';const f=await fixture(t,{local:local({SEC_CANARY:ref('SEC_MISSING'),SEC_SECOND:ref('SEC_TOKEN')})});
 await f.env('SEC_TOKEN='+v+'\n');const r=await cli(f,['list','local','--json']);result(r,1);noCanary(r,v);JSON.parse(r.stderr);
 await f.write({[v]:{type:'bad'},local:local({SEC_CANARY:v})});
 const bad=await cli(f,['servers','--json']);result(bad,1);noCanary(bad,v);JSON.parse(bad.stderr);
 const usage=await cli(f,['--'+v,'--json']);result(usage,2);noCanary(usage,v);JSON.parse(usage.stderr);
});
test('SEC-11 quoted escaped Unicode credential',async t=>{
 const v='SEC_"\\_雪';const f=await fixture(t,secretCfg(v));const r=await call(f,v,['--json']);result(r);noCanary(r,v);assert.ok(!JSON.parse(r.stdout).output.includes(v));
});
test('SEC-12 JSON error and success parseability',async t=>{
 const f=await fixture(t,secretCfg('"name"'));const r=await cli(f,['list','local','--json']);assert.ok(Array.isArray(json(r)));
 const bad=await cli(f,['list','missing','--json']);assert.equal(typeof json(bad,1).error,'string');
});
test('SEC-13 fixed JSON keys and value types',async t=>{
 const f=await fixture(t,secretCfg('name'));const list=json(await cli(f,['list','local','--json']));assert.ok(list.every(x=>typeof x.name==='string'&&typeof x.description==='string'));
 const r=json(await cli(f,['ping','local','--json']));assert.equal(r.ok,true);assert.equal(typeof r.latencyMs,'number');
});
test('SEC-14 nested data and dynamic keys, collisions rejected',async t=>{
 const v='SEC_DYNAMIC_KEY';const f=await fixture(t,{local:local({SEC_CANARY:v,SEC_SECOND:'SEC_COLLISION_SECOND'})});
 const r=await cli(f,['call','local','nested','--json']);result(r);noCanary(r,v);const nested=JSON.parse(JSON.parse(r.stdout).output);assert.deepEqual(Object.values(nested).find(Array.isArray).slice(1),[17,true,null]);
 const c=await cli(f,['call','local','collision','--json']);result(c,1);noCanary(c,v,'SEC_COLLISION_SECOND');JSON.parse(c.stderr);
});
test('SEC-15 redaction before truncation',async t=>{
 const v='SEC_TRUNCATION_CANARY';const f=await fixture(t,secretCfg(v));const r=await call(f,v.repeat(10),['--json','--max-chars','8']);result(r);noCanary(r,v);assert.equal(JSON.parse(r.stdout).truncated,true);
});
const probe=async(f,options={})=>JSON.parse(json(await cli(f,['call','local','probe','--json'],options)).output);
test('SEC-16 unrelated parent environment excluded',async t=>{
 const f=await fixture(t,{local:local()});assert.equal((await probe(f,{env:{SEC_UNRELATED:'SEC_UNRELATED_VALUE'}})).unrelated,false);
});
test('SEC-17 explicit configured environment retained',async t=>{
 const f=await fixture(t,{local:local({SEC_EXPLICIT:'explicit-test-value'})});assert.equal((await probe(f)).explicit,true);
});
test('SEC-18 platform defaults and configured override',async t=>{
 const isWin=process.platform==='win32';const env=isWin?{sec_case:'override-value',Path:'SEC_PATH_OVERRIDE'}:{SEC_CASE:'override-value',PATH:'SEC_PATH_OVERRIDE'};
 const f=await fixture(t,{local:local(env)});const r=await probe(f,{env:{SEC_CASE:'parent-value'}});assert.equal(r.path,true);assert.equal(r.system,true);assert.equal(r.caseOverride,true);assert.equal(r.pathOverride,true);assert.equal(r.singlePath,true);
});
test('SEC-19 child stderr never bypasses redaction',async t=>{
 const v='SEC_CHILD_STDERR_VALUE';const f=await fixture(t,secretCfg(v,'stderr'));const r=await cli(f,['ping','local','--json']);result(r);noCanary(r,v);JSON.parse(r.stdout);
});
test('SEC-20 artifact integrity and disposable fixture cleanup',async t=>{
 await stageCheck();const f=await fixture(t,{local:local()});result(await cli(f,['ping','local'])); // helper after hook verifies removal
});
