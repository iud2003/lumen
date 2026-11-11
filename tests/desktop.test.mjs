import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startDesktopServer} from '../desktop/server.mjs';

test('desktop workspace persists shows and media, streams ranges, and rejects unauthenticated access',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'lumen-desktop-'));let server;
 try{
  server=await startDesktopServer({directory,port:0});
  const request=(route,options={})=>fetch(server.origin+route,{...options,headers:{cookie:'lumen-desktop='+server.token,origin:server.origin,...options.headers}});
  assert.equal((await fetch(server.origin+'/api/shows')).status,401);
  assert.equal((await request('/api/shows',{method:'POST',headers:{origin:'https://other.example','Content-Type':'application/json'},body:'{}'})).status,403);
  const created=await request('/api/shows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Desktop persistence'})});
  const show=await created.json();assert.equal(created.status,200);
  const form=new FormData();form.append('file',new Blob([new Uint8Array([1,2,3,4,5])],{type:'image/png'}),'sample.png');
  const uploaded=await request('/api/shows/'+show.id+'/media',{method:'POST',body:form});assert.equal(uploaded.status,200);const asset=await uploaded.json();
  const range=await request(asset.url,{headers:{range:'bytes=1-3'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),'bytes 1-3/5');assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[2,3,4]);
  await server.close();server=await startDesktopServer({directory,port:0});
  const saved=await(await request('/api/shows/'+show.id)).json();assert.equal(saved.show.name,'Desktop persistence');
  assert.deepEqual([...new Uint8Array(await(await request(asset.url)).arrayBuffer())],[1,2,3,4,5]);
 }finally{await server?.close();await rm(directory,{recursive:true,force:true})}
});
