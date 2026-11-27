import {createServer} from 'node:http';
import {createInterface} from 'node:readline';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const tool={name:'echo',description:'Synthetic lifecycle tool',inputSchema:{type:'object'}};
const reply=(m,opt={})=>{
 if(m.id===undefined)return;
 if(opt.hang===m.method)return;
 const result=m.method==='initialize'?{protocolVersion:m.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'life-mock',version:'1'}}:m.method==='tools/list'?{tools:[tool]}:m.method==='tools/call'?{content:[{type:'text',text:'ok'}]}:{};
 return {jsonrpc:'2.0',id:m.id,...(opt.fallback&&m.method==='ping'?{error:{code:-32601,message:'Method not found'}}:opt.error&&m.method==='tools/call'?{error:{code:-32603,message:opt.error}}:{result})};
};
export async function remote(opt={}){
 const sockets=new Set(),streams=new Map(),pending=new Set(),seen=[],timers=new Set();let seq=0;
 const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET'&&u.pathname==='/sse'){
   const id=String(++seq);seen.push('sse-open');res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});res.flushHeaders();
   streams.set(id,res);res.on('close',()=>streams.delete(id));
   if(!opt.hangStart)res.write('event: endpoint\ndata: /messages?id='+id+'\n\n');return;
  }
  if(req.method!=='POST'){res.writeHead(405);res.end();return;}
  let body='';try{for await(const chunk of req)body+=chunk;}catch{return;}
  let m;try{m=JSON.parse(body)}catch{res.writeHead(400);res.end();return;}
  seen.push(m.method);
  const out=reply(m,opt);const isSse=u.pathname==='/messages';
  if(isSse||m.id===undefined){res.writeHead(202);res.end();}
  if(!out){if(!isSse&&m.id!==undefined){pending.add(res);res.on('close',()=>pending.delete(res));}return;}
  const send=()=>{if(isSse){const stream=streams.get(u.searchParams.get('id'));if(stream&&!stream.destroyed)stream.write('event: message\ndata: '+JSON.stringify(out)+'\n\n');}
   else if(!res.destroyed){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(out));}};
  const delay=opt.delay?.[m.method]??0;
  if(delay){const id=setTimeout(()=>{timers.delete(id);send()},delay);timers.add(id);res.on('close',()=>{if(!isSse){clearTimeout(id);timers.delete(id);}});}
  else send();
 });
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s))});
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
 const base='http://127.0.0.1:'+server.address().port;
 return {http:base+'/mcp',sse:base+'/sse',seen,active:()=>pending.size+streams.size,sockets:()=>sockets.size,close:async()=>{for(const id of timers)clearTimeout(id);for(const s of sockets)s.destroy();await new Promise((ok,fail)=>server.close(e=>e?fail(e):ok()));}};
}
export const never=()=>new Promise(()=>{});
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)&&process.argv[2]==='stdio'){
 const opt={hang:process.argv[3]};
 if(process.env.LIFE_PID_FILE)writeFileSync(process.env.LIFE_PID_FILE,String(process.pid));
 if(process.argv.includes('stubborn')){process.on('SIGTERM',()=>{});setInterval(()=>{},1000);}
 const input=createInterface({input:process.stdin,crlfDelay:Infinity});
 for await(const line of input){let m;try{m=JSON.parse(line)}catch{continue;}const out=reply(m,opt);if(out)process.stdout.write(JSON.stringify(out)+'\n');}
}
