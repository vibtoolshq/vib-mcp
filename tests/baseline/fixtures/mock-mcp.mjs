import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const tool=(name)=>({name,description:'Synthetic '+name,inputSchema:{type:'object',properties:{value:{type:'string'}},additionalProperties:true}});
function reply(msg, options={}){
  if(msg.id===undefined)return undefined;
  let result;
  switch(msg.method){
    case 'initialize': result={protocolVersion:msg.params?.protocolVersion??'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'baseline-mock',version:'1.0.0'}};break;
    case 'ping': if(options.fallback)return {jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Method not found'}};result={};break;
    case 'tools/list': result=options.pages?(msg.params?.cursor?{tools:[tool('later')],...(options.repeat?{nextCursor:'next'}:{})}:{tools:[tool('echo')],nextCursor:'next'}):{tools:[tool('echo'),tool('fail'),tool('large'),tool('env'),tool('hang')]};break;
    case 'tools/call': {
      const name=msg.params?.name;
      if(name==='hang')return undefined;
      const value=name==='large'?'x'.repeat(9000):name==='env'?(process.env.QA_UNRELATED??'absent'):String(msg.params?.arguments?.value??'hello');
      result={content:[{type:'text',text:value}],...(name==='fail'?{isError:true}:{})};break;
    }
    default:return {jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Method not found'}};
  }
  return {jsonrpc:'2.0',id:msg.id,result};
}
export async function remote(options={}){
  const clients=new Set();const sockets=new Set();const sessions=new Map();let seq=0;
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(options.auth && req.headers.authorization!==options.auth){res.writeHead(401);res.end('unauthorized');return;}
    if(req.method==='GET'&&url.pathname==='/sse'){
      const id=String(++seq);res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.flushHeaders();
      clients.add(res);sessions.set(id,res);res.write('event: endpoint\ndata: /messages?sessionId='+id+'\n\n');
      res.on('close',()=>{clients.delete(res);sessions.delete(id)});return;
    }
    if(req.method==='DELETE'){res.writeHead(200);res.end();return;}
    if(req.method!=='POST'){res.writeHead(405);res.end();return;}
    let body='';for await(const chunk of req){body+=chunk;if(body.length>65536){res.writeHead(413);res.end();return;}}
    let msg;try{msg=JSON.parse(body)}catch{res.writeHead(400);res.end();return;}
    const response=reply(msg,options);
    if(url.pathname==='/messages'){
      const stream=sessions.get(url.searchParams.get('sessionId'));
      if(!stream){res.writeHead(404);res.end();return;}
      res.writeHead(202);res.end();
      if(response)stream.write('event: message\ndata: '+JSON.stringify(response)+'\n\n');
    } else if(response){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(response));}
    else if(msg.id===undefined){res.writeHead(202);res.end();}
    // Intentional pending response for hang tests; socket destroyed during cleanup.
  });
  server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s))});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const base='http://127.0.0.1:'+server.address().port;
  return {http:base+'/mcp',sse:base+'/sse',active:()=>clients.size,close:async()=>{
    for(const c of clients)c.end();
    for(const s of sockets)s.destroy();
    await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  }};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)&&process.argv[2]==='stdio'){
  if(process.env.QA_PID_FILE)writeFileSync(process.env.QA_PID_FILE,String(process.pid));
  const input=createInterface({input:process.stdin,crlfDelay:Infinity});
  for await(const line of input){
    let msg;try{msg=JSON.parse(line)}catch{continue}
    const response=reply(msg,{fallback:process.argv.includes('fallback'),pages:process.argv.includes('pages')});
    if(response)process.stdout.write(JSON.stringify(response)+'\n');
  }
}
