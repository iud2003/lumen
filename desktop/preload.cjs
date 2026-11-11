const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('lumenDesktop',{
 onStateChange:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('lumen:state',listener);return()=>ipcRenderer.removeListener('lumen:state',listener)},
 openOutput:(showId)=>ipcRenderer.invoke('lumen:open-output',showId),
 closeOutput:()=>ipcRenderer.invoke('lumen:close-output'),
 isOutput:new URLSearchParams(location.search).has('desktopOutput')
});
