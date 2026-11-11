import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {startDesktopServer} from '../desktop/server.mjs';
const server=await startDesktopServer({directory:resolve('outputs/studio-qa-data-'+Date.now()),port:0});
const base=server.origin;await mkdir('qa-output',{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-first-run','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=9888','--user-data-dir='+resolve('outputs/studio-browser-'+Date.now()),'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let root;
async function cdp(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let seq=0;const callbacks=new Map();ws.onmessage=e=>{const data=JSON.parse(e.data);if(data.id){const cb=callbacks.get(data.id);callbacks.delete(data.id);data.error?cb?.reject(data.error):cb?.resolve(data.result)}};return {send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;callbacks.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})},close(){ws.close()}}}
async function ev(p,expression){const r=await p.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
async function wait(p,expression,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){if(await ev(p,expression))return;await sleep(150)}throw Error('Timed out: '+expression)}
async function page(url){const t=await root.send('Target.createTarget',{url:'about:blank'});const all=await(await fetch('http://localhost:9888/json/list')).json();const p=await cdp(all.find(x=>x.id===t.targetId).webSocketDebuggerUrl);await p.send('Network.enable');await p.send('Network.setCacheDisabled',{cacheDisabled:true});await p.send('Network.setCookie',{url:base,name:'lumen-desktop',value:server.token,httpOnly:true,sameSite:'Strict'});await p.send('Page.enable');await p.send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});await p.send('Page.navigate',{url});return p}
async function request(route,method='GET',body){const options={method,headers:{cookie:'lumen-desktop='+server.token,origin:base,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined};let res;try{res=await fetch(base+'/api'+route,options)}catch(error){if(method!=='GET')throw error;res=await fetch(base+'/api'+route,options)}const d=await res.json();if(!res.ok)throw Error(JSON.stringify(d));return d}
try{
 for(let i=0;i<60;i++){try{const version=await(await fetch('http://localhost:9888/json/version')).json();root=await cdp(version.webSocketDebuggerUrl);break}catch{await sleep(250)}}
 const p=await page(base);await wait(p,"document.querySelectorAll('.studio-layer-row').length===3");
 const showId=(await request('/shows'))[0].id;
 async function saved(check){for(let i=0;i<150;i++){const d=await request('/shows/'+showId);if(check(d.show))return d.show;await sleep(80)}throw Error('State did not persist')}
 assert.equal(await ev(p,"[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Take Live'))"),false);
 assert.equal(await ev(p,"document.querySelectorAll('.layer-fit-buttons').length"),3);
 await ev(p,"document.querySelector('[aria-label=\"Preview FORM / sponsor on Sponsors\"]').click()");let preview=await saved(s=>s.state.cue.layers[2].clip==='sample-sponsor-b');assert.equal(preview.state.live.layers[2].clip,'sample-sponsor-a');assert.equal(preview.state.take,0);
 console.log('PASS clip title previews without changing Composition; no Take Live button');
 const pair=await request('/pair/start','POST',{});await request('/pair/claim','POST',{show:showId,code:pair.code});const out=await page(base+'/?output='+pair.id);await wait(out,"!!document.querySelector('.output-setup .primary')");await ev(out,"document.querySelector('.output-setup .primary').click()");await wait(out,"!!document.querySelector('video[data-layer=background]')&&document.querySelector('video[data-layer=background]').readyState>=2");
 await ev(p,"document.querySelector('[aria-label=\"Play FORM / sponsor on Sponsors\"]').click()");await saved(s=>s.state.live.layers[2].clip==='sample-sponsor-b');
 for(let i=0;i<100;i++){const state=await request('/shows/'+showId);if(state.players[0].report.take===state.show.state.take)break;await sleep(120)}
 await ev(p,"document.querySelector('[aria-label=\"Preview MONO / sponsor on Sponsors\"]').click()");preview=await saved(s=>s.state.cue.layers[2].clip==='sample-sponsor-a');assert.equal(preview.state.live.layers[2].clip,'sample-sponsor-b');
 await ev(out,"window.__liveVideo=document.querySelector('video[data-layer=background]');true");
 await ev(p,"document.querySelector('[aria-label=\"Fill Sponsors\"]').click()");await saved(s=>s.state.live.layers[2].fit==='cover');await wait(out,"document.querySelector('[data-layer=sponsor]').style.objectFit==='cover'");
 await ev(p,"document.querySelector('[aria-label=\"Fit Sponsors\"]').click()");await saved(s=>s.state.live.layers[2].fit==='contain');
 console.log('PASS thumbnail launches Composition directly; Fit/Fill apply live');
 const range=await ev(p,"(()=>{const r=document.querySelector('.studio-inspector input[aria-label=Opacity]').getBoundingClientRect();return {x:r.x,y:r.y+r.height/2,width:r.width}})()");
 await p.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:range.x+range.width*.3,y:range.y});await p.send('Input.dispatchMouseEvent',{type:'mousePressed',x:range.x+range.width*.3,y:range.y,button:'left',clickCount:1});
 await saved(s=>s.state.live.layers[2].opacity>.25&&s.state.live.layers[2].opacity<.35);await wait(out,"Number(document.querySelector('[data-layer=sponsor]').style.opacity)<.35");
 await p.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:range.x+range.width*.6,y:range.y,buttons:1,button:'left'});await saved(s=>s.state.live.layers[2].opacity>.55&&s.state.live.layers[2].opacity<.65);
 assert.equal(await ev(out,"window.__liveVideo===document.querySelector('video[data-layer=background]')&&!window.__liveVideo.paused"),true);
 await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:range.x+range.width*.6,y:range.y,button:'left',clickCount:1});
 console.log('PASS opacity updates while mouse is held down, without replacing the playing video');
 await ev(p,"document.querySelector('[aria-label=\"Position X %\"]').focus();document.querySelector('[aria-label=\"Position X %\"]').select()");await p.send('Input.insertText',{text:'20'});await saved(s=>s.state.live.layers[2].x===20);assert.equal(await ev(p,"document.activeElement.getAttribute('aria-label')==='Position X %'"),true);
 await ev(p,"document.querySelector('.studio-test-card').click()");await saved(s=>s.state.live.testCard===true);await wait(out,"!!document.querySelector('.mapped-output')");await sleep(150);const card=await ev(out,"(()=>{const c=document.querySelector('.mapped-output');return {resolution:c.dataset.testCardResolution,pixel:[...c.getContext('2d').getImageData(200,400,1,1).data]}})()");assert.equal(card.resolution,'1920x1080');assert.equal(card.pixel[3],255);assert.ok(Math.max(...card.pixel.slice(0,3))-Math.min(...card.pixel.slice(0,3))>60);
 await ev(p,"document.querySelector('.studio-test-card').click()");await saved(s=>s.state.live.testCard===false);await wait(out,"!document.querySelector('.mapped-output')");assert.equal(await ev(out,"window.__liveVideo===document.querySelector('video[data-layer=background]')"),true);
 console.log('PASS numeric controls update before blur; Test Card toggles without restarting media');
 await writeFile('qa-output/studio-direct-live.png',Buffer.from((await p.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await ev(p,"document.querySelectorAll('.column-cue')[0].click()");await saved(s=>s.state.live.layers[2].clip==='sample-sponsor-a');
 await ev(p,"[...document.querySelectorAll('.workspace-tabs button')].find(b=>b.textContent.includes('Output Mapping')).click()");await wait(p,"!!document.querySelector('.mapping-workspace')");await ev(p,"document.querySelector('.layout-builder button').click()");await saved(s=>s.state.live.mapping?.slices.length===4);assert.equal(await ev(p,"!!document.querySelector('.stage-mapping')"),false);
 await ev(p,"[...document.querySelectorAll('.studio-check')].find(e=>e.textContent.includes('Numbered test pattern')).querySelector('input').click()");await saved(s=>s.state.live.mapping?.testPattern===true);await wait(out,"!!document.querySelector('.mapped-output')");
 console.log('PASS column launch and mapping controls apply live without a staging button');
 await p.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);assert.equal(await ev(p,'document.documentElement.scrollWidth<=innerWidth'),true);await ev(p,"document.querySelector('.workspace-tabs button').click()");assert.equal(await ev(p,'document.documentElement.scrollWidth<=innerWidth'),true);
 console.log('PASS mobile layouts fit viewport');p.close();out.close();await root.send('Browser.close');root.close();
}finally{browser.kill();await server.close()}
