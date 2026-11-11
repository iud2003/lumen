import {validState} from './model.mjs';
import {ensureColumns} from './columns.mjs';
const fail=message=>{throw Object.assign(new Error(message),{status:400})};
const controls=new Set(['name','opacity','x','y','scale','fit','loop','muted','volume','paused','brightness','contrast','saturation','rotation','blend','blackout']);
export function applyLiveCommand(original,command){
 const state=structuredClone(original),before=JSON.stringify(state.live);
 if(!command||typeof command.kind!=='string')fail('Missing live command');
 const row=id=>{const l=state.cue.layers.find(l=>l.id===id);if(!l)fail('Layer not found');return l};
 function launch(id,assetId,slot){
  const source=row(id);if(!state.assets.some(a=>a.id===assetId))fail('Clip not found');
  if(slot!==undefined){const columns=ensureColumns(state);if(!Number.isInteger(slot)||slot<0||slot>=columns.length)fail('Invalid column');source.slots[slot]=assetId}
  const previous=state.live.layers.find(l=>l.id===id);const live={...structuredClone(source),clip:assetId,paused:false,restart:(previous?.restart||0)+1};
  source.paused=false;
  if(previous)state.live.layers[state.live.layers.indexOf(previous)]=live;else state.live.layers.push(live);
  const order=new Map(state.cue.layers.map((l,i)=>[l.id,i]));state.live.layers.sort((a,b)=>(order.get(a.id)??0)-(order.get(b.id)??0));
 }
 switch(command.kind){
  case 'launch':launch(command.layerId,command.assetId,command.slot);break;
  case 'column':{
   if(!Number.isInteger(command.index)||command.index<0||command.index>=ensureColumns(state).length)fail('Invalid column');
   for(const layer of state.cue.layers)if(layer.slots[command.index])launch(layer.id,layer.slots[command.index]);break;
  }
  case 'controls':{
   if(!Array.isArray(command.changes)||command.changes.length>8)fail('Invalid layer changes');
   for(const change of command.changes){const cue=row(change.layerId),live=state.live.layers.find(l=>l.id===change.layerId),patch=change.patch;
    if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!controls.has(k)))fail('Unsupported layer control');
    Object.assign(cue,patch);if(live)Object.assign(live,patch);
   }break;
  }
  case 'clear':{row(command.layerId).clip=null;const live=state.live.layers.find(l=>l.id===command.layerId);if(live)live.clip=null;break}
  case 'restart':{const cue=row(command.layerId);cue.restart++;const live=state.live.layers.find(l=>l.id===command.layerId);if(live)live.restart++;break}
  case 'structure':{
   const previous=new Map(state.live.layers.map(l=>[l.id,l]));
   state.live.layers=state.cue.layers.map(l=>previous.get(l.id)||{...structuredClone(l),clip:null});break;
  }
  case 'canvas':{
   const patch=command.patch;if(!patch||Object.keys(patch).some(k=>!['fade'].includes(k)))fail('Unsupported canvas control');
   Object.assign(state.cue,patch);Object.assign(state.live,patch);break;
  }
  case 'output':state.live.width=state.cue.width;state.live.height=state.cue.height;state.live.mapping=structuredClone(state.cue.mapping);break;
  case 'mapping':state.live.width=state.cue.width;state.live.height=state.cue.height;state.live.mapping=structuredClone(state.cue.mapping);break;
  case 'test-card':{
   if(typeof command.enabled!=='boolean')fail('Invalid test card state');state.live.testCard=command.enabled;
   if(!command.enabled){if(state.live.mapping)state.live.mapping.testPattern=false;if(state.cue.mapping)state.cue.mapping.testPattern=false}break;
  }
  default:fail('Unsupported live command');
 }
 if(!validState(state)||!validState({...state,columns:undefined,cue:state.live}))fail('Invalid live control values');
 if(JSON.stringify(state.live)!==before)state.take++;
 return state;
}
