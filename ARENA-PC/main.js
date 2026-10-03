// ARENA BET - app desktop (Electron). Roda o jogo numa janela própria e força uso da placa de vídeo.
const {app,BrowserWindow,ipcMain,Menu}=require('electron');
const path=require('path'),fs=require('fs'),os=require('os');
const {start}=require('./server.js');
const PORT=3000;

// ---- configuração (modo gráfico) ----
const cfgPath=()=>path.join(app.getPath('userData'),'config.json');
const readCfg=()=>{try{return JSON.parse(fs.readFileSync(cfgPath(),'utf8'))}catch{return{}}};
const saveCfg=c=>{try{fs.writeFileSync(cfgPath(),JSON.stringify(c))}catch{}};
const cfg=readCfg();

// ---- GPU: precisa ser definido ANTES do app iniciar ----
app.commandLine.appendSwitch('ignore-gpu-blocklist');      // não deixa o Chromium desligar a GPU por "lista de bloqueio"
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('force_high_performance_gpu'); // notebook: usa a placa dedicada
if(['d3d11','gl','d3d9'].includes(cfg.angle))app.commandLine.appendSwitch('use-angle',cfg.angle);

let win=null,srv=null;
// Se a porta 3000 já tem um servidor ARENA BET rodando (ex: LIGAR-SERVIDOR.bat), usa ele em vez de dar erro.
const probe=()=>new Promise(r=>{const q=require('http').get({host:'127.0.0.1',port:PORT,path:'/',timeout:1500},x=>{x.resume();r(x.statusCode===200)});q.on('error',()=>r(false));q.on('timeout',()=>{q.destroy();r(false)})});
const ensureServer=async()=>{if(srv)return srv;
 try{srv=await start(PORT)}
 catch(err){if(err.code==='EADDRINUSE'&&await probe())srv={close(){},external:true};else throw err}
 return srv};
const ips=()=>{const o=[],n=os.networkInterfaces();for(const k in n)for(const a of n[k]||[])if(a.family==='IPv4'&&!a.internal)o.push(a.address);return o};
const showLauncher=err=>win&&win.loadFile(path.join(__dirname,'launcher.html'),{hash:err?'err='+encodeURIComponent(err):''});
const trusted=e=>{try{return e.senderFrame.url.startsWith('file:')}catch{return false}}; // só o menu inicial pode usar a ponte

function createWindow(){
 Menu.setApplicationMenu(null);
 win=new BrowserWindow({width:1280,height:720,backgroundColor:'#0b0f1a',autoHideMenuBar:true,title:'ARENA BET',
  webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(e,url)=>{if(!/^(file:|http:\/\/localhost:3000)/.test(url))e.preventDefault()});
 win.webContents.on('did-fail-load',(e,code,desc,url,isMain)=>{if(isMain&&code!==-3&&!String(url).startsWith('file:'))showLauncher('Não consegui abrir o jogo ('+desc+')')});
 win.webContents.on('before-input-event',(e,i)=>{if(i.type!=='keyDown')return;
  if(i.key==='F11'){e.preventDefault();win.setFullScreen(!win.isFullScreen())}
  else if(i.key==='F10'){e.preventDefault();showLauncher()}});
 showLauncher()}

ipcMain.handle('info',e=>trusted(e)?{ips:ips(),port:PORT,angle:cfg.angle||'auto',running:!!srv}:null);
// Botão LIGAR/DESLIGAR servidor (sem entrar no jogo)
ipcMain.handle('server',async(e,on)=>{if(!trusted(e))return null;
 try{if(on)await ensureServer();else if(srv){try{srv.close()}catch{}srv=null}
  return{running:!!srv,ips:ips(),port:PORT,err:''}}
 catch(err){return{running:!!srv,ips:ips(),port:PORT,err:err.code==='EADDRINUSE'?'A porta '+PORT+' está ocupada. Feche outra janela do jogo ou o "npm run server" e tente de novo.':String(err.message||err)}}});
ipcMain.handle('play',async e=>{if(!trusted(e))return'';
 try{await ensureServer();win.loadURL('http://localhost:'+PORT+'/');return''}
 catch(err){return err.code==='EADDRINUSE'?'A porta '+PORT+' está ocupada. Feche outra janela do jogo ou o "npm run server" e tente de novo.':String(err.message||err)}});
ipcMain.handle('join',async(e,addr)=>{if(!trusted(e))return'';
 let a=String(addr||'').trim();if(!a)return'Digite o endereço do amigo (ex: 192.168.0.10:3000)';
 a=a.replace(/^http:/i,'ws:').replace(/^https:/i,'wss:');if(!/^wss?:\/\//i.test(a))a='ws://'+a;
 let u;try{u=new URL(a)}catch{return'Endereço inválido'}
 if(!u.port&&u.protocol==='ws:')u.port='3000';
 const ws=u.protocol+'//'+u.host;
 try{await ensureServer();win.loadURL('http://localhost:'+PORT+'/?srv='+encodeURIComponent(ws));return''}
 catch(err){return err.code==='EADDRINUSE'?'A porta '+PORT+' está ocupada. Feche outra janela do jogo e tente de novo.':String(err.message||err)}});
ipcMain.handle('angle',(e,v)=>{if(!trusted(e))return;cfg.angle=['d3d11','gl','d3d9'].includes(v)?v:'auto';saveCfg(cfg);app.relaunch();app.exit(0)});

if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});
 app.whenReady().then(createWindow);
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',()=>{try{srv&&srv.close()}catch{}})}