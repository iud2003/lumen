import {getColumns,ensureColumns} from '../worker/columns.mjs';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import type{Show,Player,Layer}from'./types';

type LiveCommand=Record<string,any>;
export function useStudio(){
 const [show,setShow]=useState<Show|null>(null),[shows,setShows]=useState<{id:string;name:string}[]>([]),[players,setPlayers]=useState<Player[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState('background'),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[connected,setConnected]=useState(false),[clock,setClock]=useState(Date.now());
 const latest=useRef<Show|null>(null),pending=useRef(0),blocking=useRef(0),queue=useRef<Promise<unknown>>(Promise.resolve());
 const desired=useRef(new Map<string,{patch:Partial<Layer>;seq:number}>()),sequence=useRef(0),sending=useRef(false),paint=useRef(0);
 function overlay(base:Show){if(!desired.current.size)return base;const value=structuredClone(base);for(const [id,{patch}]of desired.current)for(const comp of[value.state.cue,value.state.live]){const l=comp.layers.find(l=>l.id===id);if(l)Object.assign(l,patch)}return value}
 function adopt(value:Show){latest.current=value;setShow(overlay(value))}
 function enqueue(task:()=>Promise<boolean>,block=true){pending.current++;if(block){blocking.current++;setSaving(true)}const result=queue.current.then(task).finally(()=>{pending.current--;if(block){blocking.current--;if(!blocking.current)setSaving(false)}});queue.current=result.catch(()=>{});return result}
 async function recover(e:any){setError(e.message);if(latest.current)try{const d=await api('/shows/'+latest.current.id);adopt(d.show);setPlayers(d.players)}catch{setShow(latest.current?overlay(latest.current):null)}}
 function save(change:(s:Show)=>void,liveCommand?:LiveCommand):Promise<boolean>{return enqueue(async()=>{const before=latest.current;if(!before)return false;const next=structuredClone(before);change(next);setShow(overlay(next));try{adopt(await api('/shows/'+next.id,'PUT',{state:next.state,version:before.version,...(liveCommand?{liveCommand}:{})}));return true}catch(e){await recover(e);return false}})}
 function sendLive(command:LiveCommand){return enqueue(async()=>{const before=latest.current;if(!before)return false;try{adopt(await api('/shows/'+before.id+'/live','POST',{version:before.version,command}));return true}catch(e){await recover(e);return false}},false)}
 function flushControls(){
  if(sending.current||!desired.current.size||!latest.current)return;
  const snapshot=[...desired.current].map(([layerId,entry])=>({layerId,...structuredClone(entry)}));sending.current=true;
  enqueue(async()=>{const before=latest.current;if(!before)return false;
   try{const result=await api<Show>('/shows/'+before.id+'/live','POST',{version:before.version,command:{kind:'controls',changes:snapshot.map(({layerId,patch})=>({layerId,patch}))}});for(const item of snapshot)if(desired.current.get(item.layerId)?.seq===item.seq)desired.current.delete(item.layerId);adopt(result);return true}
   catch(e){for(const item of snapshot)if(desired.current.get(item.layerId)?.seq===item.seq)desired.current.delete(item.layerId);await recover(e);return false}
  },false).finally(()=>{sending.current=false;if(desired.current.size)setTimeout(flushControls,0)});
 }
 useEffect(()=>{let active=true;api('/shows').then(async(all)=>{if(!active)return;setShows(all);const id=new URLSearchParams(location.search).get('controlShow')||localStorage.getItem('lumen-show');const entry=all.find((s:any)=>s.id===id)||all[0];if(entry){const d=await api('/shows/'+entry.id);if(active){adopt(d.show);setPlayers(d.players)}}else{const s=await api('/shows','POST',{name:'Untitled composition'});if(active){adopt(s);setShows([s])}}}).catch(e=>active&&setError(e.message));const timer=setInterval(()=>setClock(Date.now()),1000),controls=setInterval(flushControls,40);return()=>{active=false;clearInterval(timer);clearInterval(controls);cancelAnimationFrame(paint.current)}},[]);
 useEffect(()=>{if(!show)return;setConnected(false);localStorage.setItem('lumen-show',show.id);const accept=(value:Show)=>{if(!pending.current&&!desired.current.size&&value.id===latest.current?.id&&value.version>latest.current.version)adopt(value)};const feed=new EventSource('/api/shows/'+show.id+'/stream');feed.onmessage=event=>{const data=JSON.parse(event.data);setPlayers(data.players);setConnected(true);accept(data.show)};feed.onerror=()=>setConnected(false);const off=window.lumenDesktop?.onStateChange?.(accept);return()=>{feed.close();off?.()}},[show?.id]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer)},[notice]);
 async function chooseShow(id:string){if(pending.current||desired.current.size)return;try{const d=await api('/shows/'+id);adopt(d.show);setPlayers(d.players);setSelected(d.show.state.cue.layers[0]?.id||'')}catch(e:any){setError(e.message)}}
 async function createShow(name:string){if(pending.current||desired.current.size)return;try{const s=await api('/shows','POST',{name:name||'Untitled composition'});adopt(s);setPlayers([]);setShows(all=>[s,...all]);setSelected(s.state.cue.layers[0]?.id||'')}catch(e:any){setError(e.message)}}
 async function action(kind:'blackout'|'take'){return enqueue(async()=>{const value=latest.current;if(!value)return false;try{const result=await api<Show>('/shows/'+value.id+'/'+kind,'POST',{version:value.version});adopt(result);return true}catch(e){await recover(e);return false}},false)}
 const layer=show?.state.cue.layers.find(l=>l.id===selected)||show?.state.cue.layers[0];
 function updateLayer(id:string,patch:Partial<Layer>){
  if(Object.hasOwn(patch,'clip')){sendLive({kind:'clear',layerId:id});return}
  if(Object.hasOwn(patch,'restart')){sendLive({kind:'restart',layerId:id});return}
  const previous=desired.current.get(id);desired.current.set(id,{patch:{...previous?.patch,...patch},seq:++sequence.current});
  if(!paint.current)paint.current=requestAnimationFrame(()=>{paint.current=0;if(latest.current)setShow(overlay(latest.current))});
 }
 function addLayer(){if(!show||show.state.cue.layers.length>=8)return;const id=crypto.randomUUID();save(s=>s.state.cue.layers.push({id,name:'Layer '+(s.state.cue.layers.length+1),slots:Array(getColumns(show.state).length).fill(null),clip:null,opacity:1,x:0,y:0,scale:1,fit:'contain',loop:true,muted:true,volume:1,paused:false,restart:0}),{kind:'structure'});setSelected(id)}
 function removeLayer(id:string){desired.current.delete(id);return save(s=>{s.state.cue.layers=s.state.cue.layers.filter(l=>l.id!==id)},{kind:'structure'})}
 function cue(id:string,slot:number,asset:string){setSelected(id);return save(s=>{const l=s.state.cue.layers.find(l=>l.id===id);if(!l||!s.state.assets.some(a=>a.id===asset))return;ensureColumns(s.state);if(slot<0||slot>=s.state.columns!.length)return;l.slots[slot]=asset;l.clip=asset})}
 function launch(id:string,slot:number,asset:string){setSelected(id);return sendLive({kind:'launch',layerId:id,assetId:asset,slot})}
 function cueColumn(index:number){return sendLive({kind:'column',index})}
 function testCard(){const c=latest.current?.state.live;if(c)sendLive({kind:'test-card',enabled:!(c.testCard||c.mapping?.testPattern)})}
 function updateCanvas(patch:{fade:number}){return sendLive({kind:'canvas',patch})}
 async function upload(files:FileList|File[]|null){if(!files?.length||!latest.current)return;setUploading(true);try{const showId=latest.current.id;for(const file of Array.from(files)){const form=new FormData();form.append('file',file);const response=await fetch('/api/shows/'+showId+'/media',{method:'POST',body:form});const asset=await response.json();if(!response.ok)throw Error(asset.error);if(latest.current?.id!==showId)throw Error('Select the original composition to continue importing media.');await save(s=>s.state.assets.push(asset))}setNotice('Media imported. Drag a file into a clip slot.')}catch(e:any){setError(e.message)}finally{setUploading(false)}}
 const online=players.filter(p=>clock-p.heartbeat<12000&&p.report.output);
 const required=show?.state.live.layers.map(l=>l.clip).filter(Boolean)||[];
 const ready=!!show&&online.length>0&&online.every(p=>required.every(id=>p.report.ready?.includes(id!)));
 const confirmed=!!show&&online.length>0&&online.every(p=>p.report.take===show.state.take);
 function assetState(id:string){if(!online.length)return 'Local';if(online.some(p=>p.report.errors?.[id]))return 'Error';if(online.every(p=>p.report.live?.includes(id)))return 'Live';if(online.every(p=>p.report.ready?.includes(id)))return 'Ready';return 'Loading'}
 return {show,shows,players,layer,error,setError,notice,setNotice,saving,uploading,connected,clock,online,ready,confirmed,selected,setSelected,save,chooseShow,createShow,action,updateLayer,addLayer,removeLayer,cue,launch,cueColumn,testCard,updateCanvas,upload,assetState};
}
export type StudioStore=ReturnType<typeof useStudio>;
