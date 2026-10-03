const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('arena',{
 info:()=>ipcRenderer.invoke('info'),
 play:()=>ipcRenderer.invoke('play'),
 server:on=>ipcRenderer.invoke('server',on),
 join:a=>ipcRenderer.invoke('join',a),
 angle:v=>ipcRenderer.invoke('angle',v)});