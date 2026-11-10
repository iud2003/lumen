import React,{useEffect,useRef,useState} from 'react';
import {Monitor,Maximize,ExternalLink,RefreshCw,ArrowLeft,Check,Copy} from 'lucide-react';
import {api} from './api';import {CompositionView} from './Composition';import type {Composition,Report,Show,Asset} from './types';
const ids=(c:Composition)=>[...new Set(c.layers.map(l=>l.clip).filter(Boolean))] as string[];
export function Venue({onBack}:{onBack:()=>void}){const [pair,setPair]=useState<{id:string;code:string}|null>(null),[show,setShow]=useState<Show|null>(null),[error,setError]=useState(''),[screens,setScreens]=useState<any[]>([]),[selected,setSelected]=useState(0),[report,setReport]=useState<Report>({});useEffect(()=>{const id=localStorage.getItem('lumen-player');if(id){api('/players/'+id).then(d=>{setPair({id,code:d.player.code||''});setShow(d.show);setReport(d.player.report)}).catch(()=>localStorage.removeItem('lumen-player'))}},[]);useEffect(()=>{if(!pair)return;const timer=setInterval(()=>api('/players/'+pair.id).then(d=>{setShow(d.show);setReport(d.player.report)}).catch(e=>setError(e.message)),2500);return()=>clearInterval(timer)},[pair]);async function start(){try{const p=await api('/pair/start','POST',{});localStorage.setItem('lumen-player',p.id);setPair(p)}catch(e:any){setError(e.message)}}function output(){if(!pair)return;const s=screens[selected];const w=window.open('/?output='+pair.id,'lumen-output',s?`popup,width=${s.availWidth},height=${s.availHeight},left=${s.availLeft},top=${s.availTop}`:'popup,width=1280,height=720');if(!w)setError('Allow pop-ups for this site, then Open Output again.')}return <main className="venue-page"><button className="text-button" onClick={onBack}><ArrowLeft size={16}/> Control dashboard</button><div className="venue-card"><div className="venue-icon"><Monitor size={34}/></div><div className="eyebrow">VENUE WORKSTATION</div><h1>Your stage. Connected.</h1><p>Pair this laptop, then move your output to the extended screen.</p><div className="setup-step"><b>01</b><div><h3>Connect your display</h3><p>Connect HDMI and choose <strong>Extend</strong> in your operating system’s display settings.</p></div></div><div className="setup-step"><b>02</b><div><h3>Pair with a show</h3>{pair?<><div className="pair-code">{pair.code?pair.code.slice(0,4)+' '+pair.code.slice(4):<span><Check size={20}/> Paired</span>}</div><p>{show?'Connected to '+show.name:'Enter this one-time code in the control dashboard. Expires after 10 minutes.'}</p><button className="text-button" onClick={start}><RefreshCw size={13}/> New pairing code</button></>:<button className="primary" onClick={start}>Generate pairing code</button>}</div></div><div className="setup-step"><b>03</b><div><h3>Open your audience output</h3><p>Drag the new window onto your external screen. Click Go Fullscreen inside it. The output window must stay open.</p><div className="button-row"><button disabled={!show} className="primary" onClick={output}><ExternalLink size={15}/> Open Output</button><button onClick={async()=>{try{if(!(window as any).getScreenDetails)throw new Error('Screen selection unavailable. Drag the output window to your external display.');const d=await (window as any).getScreenDetails();setScreens(d.screens)}catch(e:any){setError(e.message)}}}><Monitor size={15}/> Detect screens</button></div>{screens.length>0&&<select value={selected} onChange={e=>setSelected(+e.target.value)}>{screens.map((s,i)=><option key={i} value={i}>{s.label||`Screen ${i+1}`} · {s.width} × {s.height}</option>)}</select>}</div></div>{show&&<div className="venue-health"><span className={'dot '+(Date.now()-(report.at||0)<12000?'green':'')}/>{Date.now()-(report.at||0)<12000?'Output reporting':'Waiting for output window'} · {report.live?.length||0} live layers</div>}{error&&<div className="notice error">{error}</div>}<p className="small muted">Keep this laptop powered on, disable sleep, and leave the output open. Internet is required for updates; cached playback continues if it drops.</p></div></main>}
async function cacheAsset(asset:Asset){const cache=await caches.open('lumen-media-v1');const key=new URL(asset.url,location.origin).href;let res=await cache.match(key);if(!res){res=await fetch(asset.url);if(!res.ok)throw new Error('Download failed ('+res.status+')');const blob=await res.blob();if(blob.size>110*1024*1024)throw new Error('Asset exceeds cache limit');res=new Response(blob,{headers:{'Content-Type':blob.type}});await cache.put(key,res.clone())}const blob=await res.blob();const url=URL.createObjectURL(blob);await new Promise<void>((resolve,reject)=>{if(asset.kind==='image'){const im=new Image();im.onload=()=>resolve();im.onerror=()=>reject(new Error('Unsupported image'));im.src=url}else{const v=document.createElement('video');const t=setTimeout(()=>reject(new Error('Video decode timed out')),30000);v.preload='auto';v.muted=true;v.oncanplay=()=>{clearTimeout(t);v.removeAttribute('src');v.load();resolve()};v.onerror=()=>{clearTimeout(t);reject(new Error('Unsupported video codec. Try H.264 MP4.'))};v.src=url;v.load()}}).catch(e=>{URL.revokeObjectURL(url);throw e});return url}

type Deck={comp:Composition;assets:Asset[];take:number};
export function Output({id,autoStart=false}:{id:string;autoStart?:boolean}){
 const autoStarted=autoStart&&!!document.fullscreenElement;
 const[started,setStarted]=useState(autoStarted),[fullscreen,setFullscreen]=useState(!!document.fullscreenElement),[current,setCurrent]=useState<Deck|null>(null),[previous,setPrevious]=useState<Deck|null>(null),[urls,setUrls]=useState<Record<string,string>>({}),[visible,setVisible]=useState(false),[blackout,setBlackout]=useState(false),[setupError,setSetupError]=useState('');
 const urlRef=useRef<Record<string,string>>({}),report=useRef<Report>({ready:[],downloading:[],errors:{},live:[],take:-1,output:false}),latest=useRef<Show|null>(null),busy=useRef(false),currentRef=useRef<Deck|null>(null),startedRef=useRef(autoStarted),pending=useRef(new Set<string>()),failed=useRef<Record<string,number>>({}),rendered=useRef(new Set<string>()),confirmed=useRef(-1),timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 function playbackError(assetId:string,message:string){report.current.errors={...report.current.errors,[assetId]:message};report.current.ready=report.current.ready?.filter(i=>i!==assetId);if(currentRef.current&&ids(currentRef.current.comp).includes(assetId))setVisible(false)}
 function renderedLayer(take:number,layerId:string){
  const deck=currentRef.current;if(!deck||deck.take!==take||confirmed.current===take)return;
  rendered.current.add(layerId);
  if(deck.comp.layers.filter(l=>l.clip).every(l=>rendered.current.has(l.id))){
   confirmed.current=take;requestAnimationFrame(()=>requestAnimationFrame(()=>setVisible(true)));
   timers.current.push(setTimeout(()=>{if(currentRef.current?.take!==take)return;setPrevious(null);report.current.live=ids(deck.comp);report.current.take=take;if(latest.current?.state.take===take)localStorage.setItem('lumen-last-'+id,JSON.stringify(latest.current))},deck.comp.fade+100));
  }
 }
 useEffect(()=>{
  let active=true;const stored=localStorage.getItem('lumen-last-'+id);if(stored){try{latest.current=JSON.parse(stored);setBlackout(latest.current?.state.live.blackout||false)}catch{}}
  async function reconcile(){
   if(!latest.current||busy.current||!startedRef.current)return;busy.current=true;
   try{
    const show=latest.current;const wanted=[...new Set([...ids(show.state.live),...ids(show.state.cue)])];
    await Promise.all(wanted.map(async assetId=>{
     if(urlRef.current[assetId]||pending.current.has(assetId)||(failed.current[assetId]||0)>Date.now())return;
     const asset=show.state.assets.find(a=>a.id===assetId);if(!asset)return;
     pending.current.add(assetId);report.current.downloading=[...pending.current];
     try{const u=await cacheAsset(asset);if(!active){URL.revokeObjectURL(u);return}urlRef.current[assetId]=u;setUrls({...urlRef.current});const errors={...report.current.errors};delete errors[assetId];report.current.errors=errors}
     catch(e:any){playbackError(assetId,e.message);failed.current[assetId]=Date.now()+15000}
     finally{pending.current.delete(assetId);report.current.downloading=[...pending.current];report.current.ready=Object.keys(urlRef.current).filter(k=>!report.current.errors?.[k])}
    }));
    if(!active||latest.current?.version!==show.version)return;
    if(ids(show.state.live).every(i=>urlRef.current[i]&&!report.current.errors?.[i])&&currentRef.current?.take!==show.state.take){
     const next={comp:show.state.live,assets:show.state.assets,take:show.state.take};
     // Keep the last confirmed deck mounted until the replacement proves playback.
     const old=currentRef.current;if(old&&confirmed.current===old.take)setPrevious(old);
     setVisible(false);rendered.current.clear();setCurrent(next);currentRef.current=next;
     if(!next.comp.layers.some(l=>l.clip))renderedLayer(next.take,'empty');
    }
   }finally{busy.current=false}
  }
  async function sync(){try{const d=await api('/players/'+id,'POST',{...report.current,output:startedRef.current});if(!active)return;if(d.show){latest.current=d.show;setBlackout(d.show.state.live.blackout);await reconcile()}}catch{await reconcile()}}
  sync();const timer=setInterval(sync,1500);
  return()=>{active=false;clearInterval(timer);timers.current.forEach(clearTimeout);Object.values(urlRef.current).forEach(URL.revokeObjectURL)};
 },[id]);
 useEffect(()=>{const handler=()=>setFullscreen(!!document.fullscreenElement);document.addEventListener('fullscreenchange',handler);const key=(e:KeyboardEvent)=>{if(e.key.toLowerCase()==='f')document.documentElement.requestFullscreen().catch(()=>{})};window.addEventListener('keydown',key);return()=>{document.removeEventListener('fullscreenchange',handler);window.removeEventListener('keydown',key)}},[]);
 async function start(){try{await document.documentElement.requestFullscreen();setStarted(true);startedRef.current=true;report.current.output=true;const nav=navigator as any;nav.wakeLock?.request('screen').catch(()=>{});}catch(e:any){setSetupError('Fullscreen unavailable: '+e.message+'. Use Start windowed, then F11.')}}
 return <div className="audience-output" style={{cursor:fullscreen?'none':'default'}}>
  {[previous,current].filter((d):d is Deck=>!!d).map(deck=><div key={deck.take} className="output-plane" style={deck===current?{opacity:visible?1:0,transition:visible?'opacity '+deck.comp.fade+'ms linear':'none'}:undefined}><CompositionView comp={{...deck.comp,blackout:false}} assets={deck.assets} urls={urls} audible onReady={layer=>renderedLayer(deck.take,layer)} onError={playbackError}/></div>)}
  {started&&blackout&&<div className="blackout-cover"/>}
  {!started&&<div className="output-setup"><div className="venue-icon"><Monitor size={32}/></div><h1>Ready for the big screen.</h1><p>Drag this window onto your extended display.<br/>Start fullscreen before the audience enters.</p><button className="primary" onClick={start}><Maximize size={17}/> Go Fullscreen</button><button className="text-button" onClick={()=>{setStarted(true);startedRef.current=true}}>Start windowed</button>{setupError&&<p>{setupError}</p>}<small>After starting, controls and messages stay off this screen.<br/>Press F to enter fullscreen again. Press Esc to exit fullscreen.</small></div>}
 </div>
}
