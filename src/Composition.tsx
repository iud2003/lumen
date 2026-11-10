import React,{useEffect,useRef} from 'react';
import type {Asset,Composition,Layer} from './types';
type Events={onError?:(id:string,e:string)=>void;onReady?:(id:string)=>void};
function Clip({asset,layer,url,audible,onError,onReady}:{asset:Asset;layer:Layer;url:string;audible:boolean}&Events){
 const ref=useRef<HTMLVideoElement>(null);
 useEffect(()=>{const v=ref.current;if(!v)return;v.volume=layer.volume;v.muted=!audible||layer.muted;v.loop=layer.loop;if(layer.paused){v.pause();if(v.readyState>=2)onReady?.(layer.id)}else v.play().then(()=>onReady?.(layer.id)).catch(e=>onError?.(asset.id,'Playback blocked: '+e.message));},[layer.paused,layer.muted,layer.volume,layer.loop,audible,url]);
 useEffect(()=>{if(ref.current)ref.current.currentTime=0},[layer.restart]);
 const style:React.CSSProperties={width:'100%',height:'100%',objectFit:layer.fit,opacity:layer.blackout?0:layer.opacity,transform:`translate(${layer.x}%,${layer.y}%) scale(${layer.scale})`,position:'absolute',inset:0};
 return asset.kind==='video'?<video ref={ref} src={url} style={style} autoPlay={!layer.paused} playsInline muted={!audible||layer.muted} loop={layer.loop} onLoadedData={()=>{if(layer.paused)onReady?.(layer.id)}} onError={()=>onError?.(asset.id,'Video decode failed. Use H.264 MP4 or supported WebM.')} />:<img src={url} style={style} alt="" onLoad={()=>onReady?.(layer.id)} onError={()=>onError?.(asset.id,'Image failed to render')} />
}
export function CompositionView({comp,assets,urls,audible=false,onError,onReady}:{comp:Composition;assets:Asset[];urls?:Record<string,string>;audible?:boolean}&Events){return <div className="composition" style={{aspectRatio:`${comp.width}/${comp.height}`,'--aspect':comp.width/comp.height} as React.CSSProperties}>{comp.layers.map(l=>{const a=assets.find(a=>a.id===l.clip);return a&&(!urls||urls[a.id])?<Clip key={l.id+':'+a.id} asset={a} layer={l} url={urls?.[a.id]||a.url} audible={audible} onError={onError} onReady={onReady}/>:null})}{comp.blackout&&<div className="blackout-cover"/>}</div>}
