import {paintTestCard} from './TestCard';
import React,{useEffect,useRef} from 'react';
import type {Composition} from './types';

export function layerFilter(layer:Composition['layers'][number]){return `brightness(${layer.brightness??1}) contrast(${layer.contrast??1}) saturate(${layer.saturation??1})`}
export function MappingCanvas({comp,source,audible}:{comp:Composition;source:React.RefObject<HTMLDivElement|null>;audible:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef(comp);latest.current=comp;
 useEffect(()=>{
  const target=canvas.current;if(!target)return;
  const ctx=target.getContext('2d',{alpha:false});const buffer=document.createElement('canvas');
  target.width=buffer.width=comp.width;target.height=buffer.height=comp.height;
  const input=buffer.getContext('2d',{alpha:false});if(!ctx||!input)return;
  let frame=0,last=0;
  function draw(now:number){
   frame=requestAnimationFrame(draw);if(now-last<(audible?16:66))return;last=now;
   const c=latest.current,rect={x:0,y:0,width:c.width,height:c.height},map=c.mapping?.enabled?c.mapping:{enabled:true,testPattern:false,slices:[{id:'test-card',name:'Test card',enabled:true,input:rect,output:rect,rotation:0,flipX:false,flipY:false}]};if(!c.testCard&&!c.mapping?.enabled)return;
   input!.save();input!.fillStyle='#000';input!.fillRect(0,0,c.width,c.height);
   if(map.testPattern||c.testCard){
    paintTestCard(input!,c.width,c.height);
   }else for(const layer of c.layers){
    if(!layer.clip||layer.blackout||layer.opacity===0)continue;
    const media=source.current?.querySelector<HTMLVideoElement|HTMLImageElement>(`[data-layer="${CSS.escape(layer.id)}"]`);if(!media)continue;
    const isVideo=media instanceof HTMLVideoElement;
    const w=isVideo?media.videoWidth:media.naturalWidth,h=isVideo?media.videoHeight:media.naturalHeight;
    if(!w||!h||(isVideo&&media.readyState<2))continue;
    const fit=layer.fit==='cover'?Math.max(c.width/w,c.height/h):Math.min(c.width/w,c.height/h);
    input!.save();input!.globalAlpha=layer.opacity;input!.globalCompositeOperation=layer.blend==='normal'||!layer.blend?'source-over':layer.blend;
    input!.filter=layerFilter(layer);input!.translate(c.width/2+layer.x*c.width/100,c.height/2+layer.y*c.height/100);
    input!.rotate((layer.rotation??0)*Math.PI/180);input!.scale(layer.scale,layer.scale);
    try{input!.drawImage(media,-w*fit/2,-h*fit/2,w*fit,h*fit)}catch{}
    input!.restore();
   }
   input!.restore();ctx!.fillStyle='#000';ctx!.fillRect(0,0,c.width,c.height);
   for(const [index,slice] of map.slices.entries()){
    if(!slice.enabled)continue;const a=slice.input,b=slice.output;
    ctx!.save();ctx!.translate(b.x+b.width/2,b.y+b.height/2);ctx!.rotate(slice.rotation*Math.PI/180);ctx!.scale(slice.flipX?-1:1,slice.flipY?-1:1);
    ctx!.drawImage(buffer,a.x,a.y,a.width,a.height,-b.width/2,-b.height/2,b.width,b.height);
    if(map.testPattern){ctx!.strokeStyle='#fff';ctx!.lineWidth=4;ctx!.strokeRect(-b.width/2,-b.height/2,b.width,b.height);ctx!.fillStyle='#000c';ctx!.fillRect(-b.width/2,-b.height/2,b.width,Math.min(56,b.height));ctx!.fillStyle='#fff';ctx!.font='bold '+Math.max(8,Math.min(24,c.height*.024))+'px Segoe UI';ctx!.fillText(`${String(index+1).padStart(2,'0')}  ${slice.name}  /  ${b.width} \u00d7 ${b.height}`,16-b.width/2,Math.min(36,b.height*.3)-b.height/2,Math.max(1,b.width-32))}
    ctx!.restore();
   }
  }
  frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
 },[comp.width,comp.height,audible,source]);
 return <canvas className="mapped-output" ref={canvas} aria-label={comp.testCard||comp.mapping?.testPattern?'Lumen Split Signal test card: '+comp.width+' \u00d7 '+comp.height+' canvas pixels':'Mapped LED output'} data-test-card-resolution={comp.testCard||comp.mapping?.testPattern?comp.width+'x'+comp.height:undefined}/>;
}
