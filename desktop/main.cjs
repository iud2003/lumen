const {app,BrowserWindow,ipcMain,screen,session,dialog,Menu,powerSaveBlocker}=require('electron');
const path=require('node:path');
let server,mainWindow,outputWindow,wakeLock;
const smoke=process.argv.includes('--desktop-smoke');
const userDataArg=process.argv.find(a=>a.startsWith('--desktop-data='));
app.setName('Lumen Desktop');
const userDataPath=userDataArg?path.resolve(userDataArg.slice('--desktop-data='.length)):path.join(app.getPath('appData'),'Lumen Desktop');
require('node:fs').mkdirSync(userDataPath,{recursive:true});
app.setPath('userData',userDataPath);
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
if(!app.requestSingleInstanceLock()){app.quit()}else{
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus()}});
 app.whenReady().then(start).catch(error=>{dialog.showErrorBox('Lumen could not start',error.message);app.quit()});
}
function preferences(){return {preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}}
function secure(win){
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==server.origin)event.preventDefault()});
 win.webContents.on('will-attach-webview',event=>event.preventDefault());
}
function requireDashboard(event){if(event.sender!==mainWindow?.webContents||new URL(event.senderFrame.url).origin!==server.origin)throw Error('Only the control dashboard can manage output')}
async function localAPI(route,body,method=body?'POST':'GET'){const res=await fetch(server.origin+'/api'+route,{method,headers:{cookie:'lumen-desktop='+server.token,origin:server.origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await res.json();if(!res.ok)throw Error(data.error);return data}
async function openOutput(showId,testOnPrimary=false){
 if(typeof showId!=='string'||showId.length>100)throw Error('Select a saved show first');
 await localAPI('/shows/'+encodeURIComponent(showId));
 const primary=screen.getPrimaryDisplay();const display=smoke&&process.argv.includes('--smoke-primary')?primary:screen.getAllDisplays().find(d=>d.id!==primary.id)||(smoke&&testOnPrimary?primary:null);
 if(!display)throw Error('Connect a second display and choose Extend in Windows display settings.');
 const pair=await localAPI('/pair/start',{});await localAPI('/pair/claim',{show:showId,code:pair.code});
 outputWindow?.close();
 const output=new BrowserWindow({...display.bounds,title:'Lumen Output',backgroundColor:'#000000',frame:false,show:false,autoHideMenuBar:true,webPreferences:preferences()});
 outputWindow=output;secure(output);
 output.on('closed',()=>{if(outputWindow===output)outputWindow=null;if(wakeLock!==undefined&&powerSaveBlocker.isStarted(wakeLock))powerSaveBlocker.stop(wakeLock);wakeLock=undefined});
 output.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='Escape'){event.preventDefault();output.close()}});
 await output.loadURL(server.origin+'/?output='+encodeURIComponent(pair.id)+'&desktopOutput=1');
 output.setBounds(display.bounds);output.setFullScreen(true);output.showInactive();
 mainWindow.focus();wakeLock=powerSaveBlocker.start('prevent-display-sleep');
 return {playerId:pair.id,displayId:display.id};
}
async function start(){
 const {startDesktopServer}=await import('./server.mjs');
 server=await startDesktopServer({directory:path.join(app.getPath('userData'),'data'),port:smoke?0:18787,onStateChange:value=>{for(const win of [mainWindow,outputWindow])if(win&&!win.isDestroyed())win.webContents.send('lumen:state',value)}});
 await session.defaultSession.cookies.set({url:server.origin,name:'lumen-desktop',value:server.token,httpOnly:true,sameSite:'strict'});
 session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 ipcMain.handle('lumen:open-output',(event,id)=>{requireDashboard(event);return openOutput(id)});
 ipcMain.handle('lumen:close-output',event=>{requireDashboard(event);outputWindow?.close()});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'File',submenu:[{label:'Open data folder',click:()=>require('electron').shell.openPath(path.join(app.getPath('userData'),'data'))},{type:'separator'},{role:'quit'}]},{label:'View',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]}]));
 mainWindow=new BrowserWindow({width:1440,height:960,minWidth:850,minHeight:600,title:'Lumen Desktop',icon:path.join(__dirname,'icon.ico'),backgroundColor:'#080808',show:false,webPreferences:preferences()});secure(mainWindow);
 mainWindow.once('ready-to-show',()=>{mainWindow.maximize();mainWindow.show()});
 mainWindow.on('closed',()=>{mainWindow=null;outputWindow?.close();app.quit()});
 screen.on('display-removed',()=>{if(outputWindow&&!screen.getAllDisplays().some(d=>d.id!==screen.getPrimaryDisplay().id))outputWindow.close()});
 await mainWindow.loadURL(server.origin);
 if(smoke)await runSmoke();
}
async function runSmoke(){
 const fs=require('node:fs/promises');const report={node:process.versions.node,electron:process.versions.electron,displays:screen.getAllDisplays().map(d=>({id:d.id,bounds:d.bounds}))};
 try{
  for(let i=0;i<80;i++){if(await mainWindow.webContents.executeJavaScript("document.querySelectorAll('.layer-row').length>0"))break;await new Promise(r=>setTimeout(r,150))}
  report.dashboard=await mainWindow.webContents.executeJavaScript("({rows:document.querySelectorAll('.layer-row').length,bridge:!!window.lumenDesktop,background:getComputedStyle(document.body).backgroundColor})");
  const show=(await localAPI('/shows'))[0];if(!show)throw Error('Dashboard did not create a show');
  report.secondaryDisplayAvailable=screen.getAllDisplays().length>1;
  report.output=await openOutput(show.id,true);
  for(let i=0;i<150;i++){
   const ready=await outputWindow.webContents.executeJavaScript("[...document.querySelectorAll('video')].some(v=>!v.paused&&v.readyState>=2)");
   const state=await localAPI('/shows/'+show.id);
   if(ready&&state.players.some(p=>p.id===report.output.playerId&&p.report.take===state.show.state.take&&p.report.output))break;
   await new Promise(r=>setTimeout(r,200));
  }
  report.outputBounds=outputWindow.getBounds();report.fullscreen=outputWindow.isFullScreen();
  report.playback=await outputWindow.webContents.executeJavaScript("({setup:!!document.querySelector('.output-setup'),canvas:!!document.querySelector('.audience-output'),videos:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,ready:v.readyState}))})");
  report.heartbeat=(await localAPI('/shows/'+show.id)).players;
  if(!report.dashboard.bridge||!report.fullscreen||report.playback.setup||!report.playback.videos.some(v=>!v.paused&&v.ready>=2))throw Error('Desktop smoke checks failed');
  const snapshot=(await localAPI('/shows/'+show.id)).show;
  const rect={x:0,y:0,width:snapshot.state.cue.width,height:snapshot.state.cue.height};
  snapshot.state.cue.mapping={enabled:true,testPattern:true,slices:[{id:'native-smoke',name:'Native output',enabled:true,input:{...rect},output:{...rect},rotation:0,flipX:false,flipY:false}]};snapshot.state.cue.fade=0;
  const staged=await localAPI('/shows/'+show.id,{version:snapshot.version,state:snapshot.state},'PUT');
  const live=await localAPI('/shows/'+show.id+'/take',{version:staged.version});
  for(let i=0;i<150;i++){const state=await localAPI('/shows/'+show.id);if(state.players.some(p=>p.id===report.output.playerId&&p.report.take===live.state.take))break;await new Promise(r=>setTimeout(r,200))}
  report.mapping=await outputWindow.webContents.executeJavaScript("(()=>{const c=document.querySelector('.mapped-output');return {canvas:!!c,resolution:c?.dataset.testCardResolution,pixel:c?[...c.getContext('2d').getImageData(200,400,1,1).data]:null}})()");
  if(!report.mapping.canvas||report.mapping.resolution!==rect.width+'x'+rect.height||report.mapping.pixel[3]!==255||Math.max(...report.mapping.pixel.slice(0,3))-Math.min(...report.mapping.pixel.slice(0,3))<60)throw Error('Native Lumen test card did not render');
  await fs.writeFile(path.join(app.getPath('userData'),'studio-dashboard.png'),(await mainWindow.webContents.capturePage()).toPNG());
  await outputWindow.webContents.executeJavaScript("window.__controlVideo=document.querySelector('video');true");
  const current=(await localAPI('/shows/'+show.id)).show;const started=Date.now();await localAPI('/shows/'+show.id+'/live',{version:current.version,command:{kind:'controls',changes:[{layerId:'background',patch:{opacity:.42}}]}});
  for(let i=0;i<100;i++){if(await outputWindow.webContents.executeJavaScript("Number(document.querySelector('video').style.opacity)===.42"))break;await new Promise(r=>setTimeout(r,20))}
  report.liveControls={latencyMs:Date.now()-started,...await outputWindow.webContents.executeJavaScript("({sameVideo:window.__controlVideo===document.querySelector('video'),opacity:Number(document.querySelector('video').style.opacity),playing:!document.querySelector('video').paused})")};
  if(!report.liveControls.sameVideo||!report.liveControls.playing||report.liveControls.opacity!==.42||report.liveControls.latencyMs>1500)throw Error('Native real-time controls failed');
  report.ok=true;
 }catch(e){report.error=e.stack;report.ok=false}
 await fs.writeFile(path.join(app.getPath('userData'),'smoke-result.json'),JSON.stringify(report,null,2));app.quit();
}
app.on('window-all-closed',()=>app.quit());
app.on('will-quit',()=>{server?.close().catch(()=>{})});
