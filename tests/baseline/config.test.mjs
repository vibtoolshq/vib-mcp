import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture,cli,result,json,stdioConfig} from './helpers.mjs';
import {remote} from './fixtures/mock-mcp.mjs';

test('QA-13 config path precedence and explicit config',async t=>{
 const f=await fixture(t,{adjacent:{type:'stdio',command:'node'}});
 const cwd=join(f.dir,'other');await mkdir(join(cwd,'.vib-mcp'),{recursive:true});
 await writeFile(join(cwd,'.vib-mcp','servers.json'),JSON.stringify({servers:{cwd:{type:'stdio',command:'node'}}}));
 assert.equal(json(await cli(f,['servers','--json'],{cwd}))[0].name,'adjacent');
 assert.equal(json(await cli(f,['servers','--config','.vib-mcp/servers.json','--json'],{cwd}))[0].name,'cwd');
});
test('QA-14 sibling dotenv takes precedence, process fallback, missing variable',async t=>{
 const m=await remote({auth:'Bearer QA_SYNTHETIC_SECRET_LOCAL'});t.after(()=>m.close());
 const f=await fixture(t,{auth:{type:'http',url:m.http,headers:{Authorization:'Bearer '+'$'+'{QA_TOKEN}'}}});
 await f.env('QA_TOKEN=QA_SYNTHETIC_SECRET_LOCAL\n');
 result(await cli(f,['ping','auth'],{env:{QA_TOKEN:'QA_SYNTHETIC_SECRET_WRONG'}}));
 await f.env('');
 result(await cli(f,['ping','auth'],{env:{QA_TOKEN:'QA_SYNTHETIC_SECRET_LOCAL'}}));
 result(await cli(f,['ping','auth']),1);
});
test('QA-15 malformed config, invalid timeout and missing fields',async t=>{
 const f=await fixture(t);
 await writeFile(f.config,'{');result(await cli(f,['servers']),1);
 for(const cfg of [{type:'invalid'},{type:'http',url:''},{type:'http',url:'http://127.0.0.1',timeout:0},{type:'stdio',command:''},{type:'stdio',command:'node',args:[1]}]){
   await f.write({x:cfg});result(await cli(f,['servers']),1);
 }
});
test('QA-15 remote config rejects non-HTTP protocol',async t=>{
 const f=await fixture(t,{x:{type:'http',url:'file:///synthetic'}});
 result(await cli(f,['servers']),1);
});
test('QA-15 unsafe timer values rejected without network',async t=>{
 const f=await fixture(t,{x:stdioConfig({timeout:2147483648})});
 result(await cli(f,['servers']),1);
});
test('QA-17 malformed existing file not overwritten',async t=>{
 const f=await fixture(t);
 await writeFile(f.config,'{');result(await cli(f,['add','x','http://127.0.0.1:1']),1);
 const {readFile}=await import('node:fs/promises');assert.equal(await readFile(f.config,'utf8'),'{');
});
test('QA-17 concurrent independent adds preserve every successful update',async t=>{
 const f=await fixture(t);
 const names=Array.from({length:10},(_,i)=>'s'+i);
 const runs=await Promise.all(names.map(n=>cli(f,['add',n,'http://127.0.0.1:1'])));
 runs.forEach(r=>result(r));assert.deepEqual(Object.keys((await f.read()).servers).sort(),names.sort());
});
test('QA-17 existing unknown fields are preserved or mutation rejected',async t=>{
 const f=await fixture(t,{one:{type:'http',url:'http://127.0.0.1:1',extension:'synthetic'}});
 const r=await cli(f,['add','two','http://127.0.0.1:2']);
 assert.equal(r.timedOut,false);
 if(r.code!==0){assert.equal((await f.read()).servers.one.extension,'synthetic');return;}
 assert.equal((await f.read()).servers.one.extension,'synthetic');
});
