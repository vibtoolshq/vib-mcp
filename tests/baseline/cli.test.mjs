import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture,cli,result,json } from './helpers.mjs';

test('QA-08/09 standalone help and version',async t=>{
 const f=await fixture(t);
 assert.match(result(await cli(f,['--help'])).stdout,/Usage:/);
 assert.equal(result(await cli(f,['--version'])).stdout.trim(),'1.0.0');
});
test('QA-10 servers text/json and empty config',async t=>{
 const f=await fixture(t);
 assert.match(result(await cli(f,['servers'])).stdout,/No servers configured/);
 assert.deepEqual(json(await cli(f,['servers','--json'])),[]);
 await f.write({local:{type:'stdio',command:'node'},remote:{type:'http',url:'http://127.0.0.1:1/mcp'}});
 const names=json(await cli(f,['servers','--json'])).map(x=>x.name).sort();
 assert.deepEqual(names,['local','remote']);
 assert.match(result(await cli(f,['servers'])).stdout,/remote \[http\]/);
});
test('QA-11 add/upsert HTTP/SSE and reference only',async t=>{
 const f=await fixture(t);
 result(await cli(f,['add','one','http://127.0.0.1:1/mcp']));
 result(await cli(f,['add','two','http://127.0.0.1:1/sse','--type','sse','--token-env','QA_TOKEN']));
 let data=await f.read();
 assert.equal(data.servers.two.type,'sse');
 assert.equal(data.servers.two.headers.Authorization,'Bearer '+ '$'+'{QA_TOKEN}');
 assert.equal(data.servers.one.type,'http');
 result(await cli(f,['add','one','http://127.0.0.1:2/mcp']));
 data=await f.read();
 assert.equal(data.servers.one.url,'http://127.0.0.1:2/mcp');
 assert.ok(data.servers.two);
});
test('QA-12 remove existing and missing',async t=>{
 const f=await fixture(t,{one:{type:'http',url:'http://127.0.0.1:1'}});
 assert.equal(json(await cli(f,['remove','one','--json'])).removed,'one');
 assert.deepEqual((await f.read()).servers,{});
 result(await cli(f,['remove','one']),1);
});
test('QA-16 invalid usage and parseable JSON errors',async t=>{
 const f=await fixture(t);
 for(const args of [['unknown'],['list'],['servers','--bad'],['--timeout','0','servers'],['--max-chars','-1','servers'],['call','x','echo','[]'],['call','x','echo','{'],['add','x','ftp://localhost']]){
   const r=await cli(f,[...args,'--json']);assert.equal(typeof json(r,2).error,'string');
 }
 assert.equal(typeof json(await cli(f,['list','missing','--json']),1).error,'string');
});
test('QA-16 unknown call option is a usage error',async t=>{
 const f=await fixture(t);result(await cli(f,['call','--bad','echo']),2);
});
test('QA-16 blank add name is a usage error',async t=>{
 const f=await fixture(t);result(await cli(f,['add','','http://127.0.0.1:1']),2);
});
