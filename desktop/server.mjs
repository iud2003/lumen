import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,rename,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import worker from '../dist/server/index.js';

export async function openStorage(directory){
 await mkdir(join(directory,'media'),{recursive:true});
 const db=new DatabaseSync(join(directory,'lumen.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
 if(!db.prepare("SELECT name FROM sqlite_master WHERE name='shows'").get()){
  db.exec(await readFile(new URL('../drizzle/0000_lumen.sql',import.meta.url),'utf8'));
 }
 const DB={prepare(sql){const statement=db.prepare(sql);let values=[];return {
  bind(...args){values=args;return this},
  async first(){return statement.get(...values)||null},
  async all(){return {results:statement.all(...values)}},
  async run(){const result=statement.run(...values);return {meta:{changes:Number(result.changes)}}}
 }}};
 function mediaPath(key){if(!/^[a-zA-Z0-9-]+$/.test(key))throw Error('Invalid media identifier');return join(directory,'media',key)}
 const BUCKET={
  async put(key,body){const target=mediaPath(key),temp=target+'.tmp';await pipeline(Readable.fromWeb(body),createWriteStream(temp));await rename(temp,target)},
  async get(key,{range}={}){
   const target=mediaPath(key);let info;try{info=await stat(target)}catch(e){if(e.code==='ENOENT')return null;throw e}
   const size=info.size;let offset=0,end=size-1,partial=false;
   const request=range?.get('range');const match=request?.match(/^bytes=(\d*)-(\d*)$/);
   if(match&&(match[1]||match[2])){
    if(match[1]){offset=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]))}
    else offset=Math.max(0,size-Number(match[2]));
    if(offset>=size||end<offset)throw Object.assign(Error('Invalid byte range'),{status:416});partial=true;
   }
   return {body:Readable.toWeb(createReadStream(target,{start:offset,end})),size,httpEtag:'"'+size+'-'+Math.floor(info.mtimeMs)+'"',...(partial?{range:{offset,length:end-offset+1}}:{})};
  }
 };
 return {db,DB,BUCKET,close:()=>db.close()};
}

export async function startDesktopServer({directory,port=18787,onStateChange}){
 const storage=await openStorage(directory),token=randomBytes(32).toString('hex');
 let origin;
 const server=createServer(async(req,res)=>{
  const controller=new AbortController();res.on('close',()=>controller.abort());
  try{
   if(req.headers.host!==new URL(origin).host){res.writeHead(403);res.end('Invalid host');return}
   if(!req.headers.cookie?.split(';').some(c=>c.trim()==='lumen-desktop='+token)){res.writeHead(401);res.end('Open Lumen Desktop to access this workspace.');return}
   const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(', '):value);
   headers.delete('oai-authenticated-user-id');headers.delete('oai-authenticated-user-email');
   const request=new Request(new URL(req.url,origin),{method:req.method,headers,signal:controller.signal,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
   const response=await worker.fetch(request,{LOCAL_DEV:'true',DB:storage.DB,BUCKET:storage.BUCKET},{});
   if(onStateChange&&response.ok&&!['GET','HEAD'].includes(req.method)&&/^\/api\/shows\/[^/]+(?:\/(?:live|take|blackout))?$/.test(new URL(request.url).pathname)){
    const changed=await response.clone().json();if(changed?.id&&changed.state?.live)try{onStateChange(changed)}catch{}
   }
   res.writeHead(response.status,Object.fromEntries(response.headers));
   if(response.body&&req.method!=='HEAD')await pipeline(Readable.fromWeb(response.body),res);else res.end();
  }catch(e){if(!controller.signal.aborted){if(!res.headersSent)res.writeHead(e.status||500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))}}
 });
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})}catch(e){storage.close();throw e}
 origin='http://127.0.0.1:'+server.address().port;
 return {origin,token,...storage,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));storage.close()}};
}
