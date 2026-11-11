import {testCardLayout} from '../src/testCardLayout.mjs';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {startDesktopServer} from '../desktop/server.mjs';
const server=await startDesktopServer({directory:resolve('outputs/studio-qa-data-'+Date.now()),port:0});
const base=server.origin;await mkdir('qa-output',{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-first-run','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=9892','--user-data-dir='+resolve('outputs/studio-browser-'+Date.now()),'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let root;
async function cdp(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let seq=0;const callbacks=new Map();ws.onmessage=e=>{const data=JSON.parse(e.data);if(data.id){const cb=callbacks.get(data.id);callbacks.delete(data.id);data.error?cb?.reject(data.error):cb?.resolve(data.result)}};return {send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;callbacks.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})},close(){ws.close()}}}
async function ev(p,expression){const r=await p.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
async function wait(p,expression,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){if(await ev(p,expression))return;await sleep(150)}throw Error('Timed out: '+expression)}
async function page(url){const t=await root.send('Target.createTarget',{url:'about:blank'});const all=await(await fetch('http://localhost:9892/json/list')).json();const p=await cdp(all.find(x=>x.id===t.targetId).webSocketDebuggerUrl);await p.send('Network.enable');await p.send('Network.setCacheDisabled',{cacheDisabled:true});await p.send('Network.setCookie',{url:base,name:'lumen-desktop',value:server.token,httpOnly:true,sameSite:'Strict'});await p.send('Page.enable');await p.send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});await p.send('Page.navigate',{url});return p}
async function request(route,method='GET',body){const options={method,headers:{cookie:'lumen-desktop='+server.token,origin:base,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined};let res;try{res=await fetch(base+'/api'+route,options)}catch(error){if(method!=='GET')throw error;res=await fetch(base+'/api'+route,options)}const d=await res.json();if(!res.ok)throw Error(JSON.stringify(d));return d}
try{
 await mkdir('outputs/test-cards',{recursive:true});
 for(let i=0;i<60;i++){try{const v=await(await fetch('http://localhost:9892/json/version')).json();root=await cdp(v.webSocketDebuggerUrl);break}catch{await sleep(250)}}
 const p=await page(base);await wait(p,"document.querySelectorAll('.studio-layer-row').length===3");const showId=(await request('/shows'))[0].id;
 const pair=await request('/pair/start','POST',{});await request('/pair/claim','POST',{show:showId,code:pair.code});const out=await page(base+'/?output='+pair.id);await wait(out,"!!document.querySelector('.output-setup .primary')");await ev(out,"document.querySelector('.output-setup .primary').click()");
 let current=(await request('/shows/'+showId)).show;await request('/shows/'+showId+'/live','POST',{version:current.version,command:{kind:'test-card',enabled:true}});
 for(const [w,h] of [[1920,1080],[1728,432],[1080,1920],[7680,240]]){
  current=(await request('/shows/'+showId)).show;current.state.cue.width=w;current.state.cue.height=h;
  await request('/shows/'+showId,'PUT',{version:current.version,state:current.state,liveCommand:{kind:'output'}});
  await wait(out,"(()=>{const c=document.querySelector('.mapped-output');return c?.width==="+w+"&&c?.height==="+h+"&&c.dataset.testCardResolution==='"+w+'x'+h+"'})()");await sleep(200);
  const l=testCardLayout(w,h),points=[{x:Math.floor(l.chroma.x+l.chroma.width*.5),y:Math.floor(l.chroma.y+l.chroma.height*.4)},{x:Math.floor(l.luma.x+l.luma.width*.7),y:Math.floor(l.luma.y+l.luma.height*.45)}];
  const result=await ev(out,"(()=>{const c=document.querySelector('.mapped-output'),x=c.getContext('2d');return {label:c.getAttribute('aria-label'),pixels:"+JSON.stringify(points)+".map(p=>[...x.getImageData(p.x,p.y,1,1).data])}})()");
  assert.ok(result.label.includes(w+' '+String.fromCharCode(215)+' '+h));const color=result.pixels[0],gray=result.pixels[1];assert.equal(color[3],255);assert.ok(Math.max(...color.slice(0,3))-Math.min(...color.slice(0,3))>60);assert.equal(gray[0],gray[1]);assert.equal(gray[1],gray[2]);
  const png=await ev(out,"document.querySelector('.mapped-output').toDataURL('image/png').split(',')[1]");await writeFile('outputs/test-cards/Lumen-Split-Signal-'+w+'x'+h+'.png',Buffer.from(png,'base64'));
  console.log('PASS '+w+' ? '+h+' resolution, chroma and grayscale checks; PNG exported');
 }
 const info=(await request('/shows/'+showId)).show;await request('/shows/'+showId,'PUT',{version:info.version,state:{...info.state,cue:{...info.state.cue,width:1920,height:1080}},liveCommand:{kind:'output'}});await wait(out,"document.querySelector('.mapped-output')?.width===1920");await sleep(100);
 const layout=testCardLayout(1920,1080),pulseBox={x:Math.floor(layout.panel.x+layout.panel.width*.8),y:Math.ceil(layout.panel.y+layout.panel.height*.895-layout.small*.5)+1,width:Math.floor(layout.panel.width*.12)};
 const pulse="(()=>{const c=document.querySelector('.mapped-output');return [...c.getContext('2d').getImageData("+pulseBox.x+","+pulseBox.y+","+pulseBox.width+",1).data]})()";
 const first=await ev(out,pulse);await sleep(300);const second=await ev(out,pulse);assert.notDeepEqual(first,second);console.log('PASS live clock pulse animates');
 p.close();out.close();await root.send('Browser.close');root.close();
}finally{browser.kill();await server.close()}
