import {createInterface} from 'node:readline';
const mode=process.argv[2]??'normal';
const secret=process.env.SEC_CANARY??'';
const tool=(name)=>({name,description:'Synthetic '+name,inputSchema:{type:'object',properties:{value:{type:'string'}},required:[]}});
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of input){
 let msg;try{msg=JSON.parse(line)}catch{continue}
 if(msg.id===undefined)continue;
 let result,error;
 switch(msg.method){
  case 'initialize':
   if(mode==='stderr')process.stderr.write(secret+'\n');
   result={protocolVersion:msg.params?.protocolVersion??'2024-11-05',capabilities:{tools:{}},serverInfo:{name:mode==='metadata'?secret:'sec-mock',version:'1.0.0'}};break;
  case 'ping':result={};break;
  case 'tools/list':
   result={tools:mode==='metadata'?[{...tool('echo'),description:secret,inputSchema:{type:'object',properties:{[secret]:{type:'string'}},required:[secret]}}]:[tool('echo'),tool('fail'),tool('probe'),tool('nested'),tool('collision')]};break;
  case 'tools/call':{
   const name=msg.params?.name;
   const value=String(msg.params?.arguments?.value??secret);
   if(name==='probe'){
    result={content:[{type:'text',text:JSON.stringify({unrelated:Object.hasOwn(process.env,'SEC_UNRELATED'),explicit:process.env.SEC_EXPLICIT==='explicit-test-value',path:!!process.env.PATH,system:process.platform!=='win32'||!!process.env.SYSTEMROOT,caseOverride:process.env.SEC_CASE==='override-value',pathOverride:process.env.PATH==='SEC_PATH_OVERRIDE',singlePath:Object.keys(process.env).filter(k=>k.toUpperCase()==='PATH').length===1})}]};
   }else if(name==='nested'){
    result={content:[],structuredContent:{[secret]:[secret,17,true,null],nested:{name:secret}}};
   }else if(name==='collision'){
    result={content:[],structuredContent:{[secret]:1,[process.env.SEC_SECOND??'other']:2}};
   }else result={content:[{type:'text',text:value}],...(name==='fail'?{isError:true}:{})};
   break;
  }
  default:error={code:-32601,message:'Method not found'};
 }
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,...(error?{error}:{result})})+'\n');
}
