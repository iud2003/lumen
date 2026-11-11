import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Monitor} from 'lucide-react';
import {api} from './api';
import {Output} from './Player';

export function ExtendedScreen({showId,onError}:{showId:string;onError:(message:string)=>void}){
 const [busy,setBusy]=useState(false);
 async function launch(){
  if(busy)return;
  setBusy(true);
  let surface:HTMLDivElement|null=null;
  let cleanup:()=>void=()=>{};
  try{
   if(window.lumenDesktop){await window.lumenDesktop.openOutput(showId);return}
   if(!(window as any).getScreenDetails)throw new Error('Use Chrome or Edge to open output on your extended screen.');
   const details=await (window as any).getScreenDetails();
   const current=details.currentScreen;
   const sameScreen=(a:any,b:any)=>a.left===b.left&&a.top===b.top&&a.width===b.width&&a.height===b.height;
   const screen=details.screens.find((s:any)=>!s.isPrimary&&!sameScreen(s,current))
    ||details.screens.find((s:any)=>!s.isPrimary)
    ||details.screens.find((s:any)=>!sameScreen(s,current));
   if(!screen)throw new Error('No extended screen found. Connect your display and choose Extend in Windows display settings.');
   surface=document.createElement('div');
   surface.style.cssText='position:fixed;inset:0;background:black;width:100vw;height:100vh;z-index:99999';
   document.body.appendChild(surface);
   // Window Management allows a companion window after fullscreen targets
   // another display. Open it before network calls expire that allowance.
   await (surface.requestFullscreen as any)({screen,navigationUI:'hide'});
   const controlScreen=details.screens.find((s:any)=>s.isPrimary&&!sameScreen(s,screen))
    ||details.screens.find((s:any)=>!sameScreen(s,screen));
   const controls=controlScreen?window.open('/?controlShow='+encodeURIComponent(showId),'lumen-controls',
    `popup,left=${controlScreen.availLeft},top=${controlScreen.availTop},width=${controlScreen.availWidth},height=${controlScreen.availHeight}`):null;
   const root=createRoot(surface);
   let active=true;
   cleanup=()=>{active=false;document.removeEventListener('fullscreenchange',onExit);root.unmount();surface?.remove()};
   function onExit(){if(document.fullscreenElement!==surface)cleanup()}
   document.addEventListener('fullscreenchange',onExit);
   const pair=await api('/pair/start','POST',{});
   await api('/pair/claim','POST',{show:showId,code:pair.code});
   if(!active)return;
   localStorage.setItem('lumen-player',pair.id);
   root.render(<Output id={pair.id} autoStart/>);
   if(!controls)onError('Allow pop-ups for this site to keep the editing dashboard on your first screen.');

  }catch(e:any){
   if(surface&&document.fullscreenElement===surface)await document.exitFullscreen().catch(()=>{});
   cleanup();surface?.remove();onError(e.message);
  }finally{setBusy(false)}
 }
 return <button className="primary" disabled={busy} onClick={launch}><Monitor size={15}/>{busy?'Opening screen...':'Extended Screen'}</button>;
}
