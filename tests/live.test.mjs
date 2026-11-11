import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {initialState} from '../worker/model.mjs';
import {applyLiveCommand} from '../worker/live.mjs';
import {startDesktopServer} from '../desktop/server.mjs';
test('launch changes Composition independently of the preview clip and repeats restart only the launched layer',()=>{
 const state=initialState(),next=applyLiveCommand(state,{kind:'launch',layerId:'sponsor',assetId:'sample-sponsor-b',slot:1});
 assert.equal(next.cue.layers[2].clip,'sample-sponsor-a');assert.equal(next.live.layers[2].clip,'sample-sponsor-b');assert.equal(next.take,1);
 assert.deepEqual(next.live.layers[0],state.live.layers[0]);
 const repeat=applyLiveCommand(next,{kind:'launch',layerId:'sponsor',assetId:'sample-sponsor-b'});assert.equal(repeat.live.layers[2].restart,2);assert.equal(repeat.cue.layers[2].clip,'sample-sponsor-a');
});
test('live controls update both monitor parameter sets without launching a preview clip',()=>{
 const state=initialState();state.cue.layers[2].clip='sample-sponsor-b';
 const next=applyLiveCommand(state,{kind:'controls',changes:[{layerId:'sponsor',patch:{opacity:.2,fit:'cover',saturation:0,volume:.5}}]});
 assert.equal(next.live.layers[2].clip,'sample-sponsor-a');assert.equal(next.cue.layers[2].clip,'sample-sponsor-b');
 for(const comp of [next.cue,next.live]){assert.equal(comp.layers[2].opacity,.2);assert.equal(comp.layers[2].fit,'cover')}
 assert.equal(next.live.layers[0].restart,state.live.layers[0].restart);
 for(const patch of [{volume:4},{opacity:-1},{clip:'sample-motion'},{muted:'yes'},{brightness:99}])assert.throws(()=>applyLiveCommand(state,{kind:'controls',changes:[{layerId:'sponsor',patch}]}));
});
test('test card and layer clearing preserve saved media and independent clip selection',()=>{
 const state=initialState(),card=applyLiveCommand(state,{kind:'test-card',enabled:true});assert.equal(card.live.testCard,true);assert.deepEqual(card.assets,state.assets);
 const off=applyLiveCommand(card,{kind:'test-card',enabled:false});assert.equal(off.live.testCard,false);assert.deepEqual(off.live.layers,state.live.layers);
 const clear=applyLiveCommand(off,{kind:'clear',layerId:'sponsor'});assert.equal(clear.live.layers[2].clip,null);assert.equal(clear.cue.layers[2].slots[0],'sample-sponsor-a');
});
test('desktop API separates title preview from direct live commands and broadcasts committed changes',async()=>{
 const prefix=resolve(tmpdir(),'lumen-direct-live-'),directory=await mkdtemp(prefix),events=[];let server;
 try{
  server=await startDesktopServer({directory,port:0,onStateChange:value=>events.push(value)});
  async function req(route,method='GET',body){const response=await fetch(server.origin+'/api'+route,{method,headers:{cookie:'lumen-desktop='+server.token,origin:server.origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()}}
  let {data:show}=await req('/shows','POST',{name:'Direct live API'});const preview=structuredClone(show.state);preview.cue.layers[2].clip='sample-sponsor-b';
  ({data:show}=await req('/shows/'+show.id,'PUT',{state:preview,version:show.version}));assert.equal(show.state.live.layers[2].clip,'sample-sponsor-a');
  ({data:show}=await req('/shows/'+show.id+'/live','POST',{version:show.version,command:{kind:'launch',layerId:'sponsor',assetId:'sample-sponsor-b'}}));assert.equal(show.state.live.layers[2].clip,'sample-sponsor-b');
  ({data:show}=await req('/shows/'+show.id+'/live','POST',{version:show.version,command:{kind:'controls',changes:[{layerId:'sponsor',patch:{opacity:.37}}]}}));assert.equal(show.state.live.layers[2].opacity,.37);
  assert.equal(events.at(-1).state.live.layers[2].opacity,.37);
  const invalid=await req('/shows/'+show.id+'/live','POST',{version:show.version,command:{kind:'controls',changes:[{layerId:'sponsor',patch:{volume:22}}]}});assert.equal(invalid.status,400);
 }finally{await server?.close();if(!resolve(directory).startsWith(prefix))throw Error('Unexpected test directory');await rm(directory,{recursive:true,force:true})}
});
