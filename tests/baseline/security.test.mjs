import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,cli,result,json,noCanary,stdioConfig} from './helpers.mjs';

test('QA-25 known synthetic credential masked in call output',async t=>{
 const canary='QA_SYNTHETIC_SECRET_LONG';
 const f=await fixture(t,{local:stdioConfig({env:{QA_TOKEN:'$'+'{QA_TOKEN}'}})});
 await f.env('QA_TOKEN='+canary+'\n');
 const r=await cli(f,['call','local','echo',JSON.stringify({value:canary}),'--json']);
 result(r);noCanary(r,canary);JSON.parse(r.stdout);
});
test('QA-25 short synthetic credential masked',async t=>{
 const canary='qZ7';const f=await fixture(t,{local:stdioConfig({env:{QA_TOKEN:'$'+'{QA_TOKEN}'}})});
 await f.env('QA_TOKEN='+canary+'\n');
 const r=await cli(f,['call','local','echo',JSON.stringify({value:canary})]);
 result(r);noCanary(r,canary);
});
test('QA-25 servers does not expose configured sensitive endpoint or names',async t=>{
 const canary='QA_SYNTHETIC_SECRET_PATH';
 const f=await fixture(t,{local:{type:'http',url:'http://127.0.0.1:1/'+canary,headers:{Authorization:'Bearer '+canary}}});
 const r=await cli(f,['servers','--json']);result(r);noCanary(r,canary);
});
test('QA-26 escaped JSON credential remains redacted and JSON valid',async t=>{
 const canary='QA_SYNTHETIC_SECRET_"quoted"';
 const f=await fixture(t,{local:stdioConfig({env:{QA_TOKEN:canary}})});
 // Ping output contains server metadata; describe/call must not expose configured strings.
 const r=await cli(f,['call','local','echo',JSON.stringify({value:canary}),'--json']);
 result(r);const parsed=JSON.parse(r.stdout);assert.ok(!parsed.output.includes(canary),'decoded JSON synthetic credential leaked');
});
test('QA-26 serialized JSON masking cannot corrupt structural output',async t=>{
 const f=await fixture(t,{local:stdioConfig({env:{QA_TOKEN:'"name"'}})});
 const r=await cli(f,['list','local','--json']);result(r);
 const parsed=JSON.parse(r.stdout);assert.ok(Array.isArray(parsed));assert.ok(parsed.every(x=>typeof x.name==='string'));
});
test('QA-27 stdio must not inherit unrelated synthetic credential',async t=>{
 const canary='QA_SYNTHETIC_SECRET_UNRELATED';const f=await fixture(t,{local:stdioConfig()});
 const r=await cli(f,['call','local','env','--json'],{env:{QA_UNRELATED:canary}});
 result(r);noCanary(r,canary);assert.ok(JSON.parse(r.stdout).output==='absent','unrelated env present');
});
