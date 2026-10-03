// Servidor do ARENA BET: serve o index.html e repassa mensagens entre 2 jogadores da mesma sala.
// Protótipo: NÃO valida nada (quem acerta, vida, posição). Confia no cliente.
// Usado pelo app desktop (main.js) e também sozinho: npm run server
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const OK=['s','hit','dead','f','map'];
const CDN='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const THREE=path.join(__dirname,'node_modules','three','build','three.min.js');

function start(port){return new Promise((resolve,reject)=>{
 const rooms=new Map(),hasThree=fs.existsSync(THREE); // com o three local, o jogo roda até sem internet
 const srv=http.createServer((q,r)=>{
  const u=(q.url||'/').split('?')[0];
  if(u==='/three.min.js'&&hasThree)return fs.readFile(THREE,(e,d)=>{
   if(e){r.writeHead(500);return r.end()}
   r.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'public, max-age=86400'});r.end(d)});
  if(u!=='/'&&u!=='/index.html'){r.writeHead(204);return r.end()}
  fs.readFile(path.join(__dirname,'index.html'),'utf8',(e,d)=>{
   if(e){r.writeHead(500);return r.end('index.html não encontrado')}
   if(hasThree)d=d.split(CDN).join('/three.min.js');
   r.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});r.end(d)})});
 const wss=new WebSocketServer({server:srv,perMessageDeflate:false});
 wss.on('error',()=>{}); // o erro de porta ocupada é tratado por srv.once('error') abaixo; sem isto o Electron mostra janela de erro
 const newCode=()=>{let c;do{c=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('')}while(rooms.has(c));return c};
 const tx=(ws,o)=>{if(ws.readyState===1)ws.send(JSON.stringify(o))};
 function leave(ws){const r=rooms.get(ws.room);if(!r)return;rooms.delete(ws.room);ws.room=null;r.forEach(p=>{if(p!==ws){tx(p,{t:'left'});p.room=null}})}
 wss.on('connection',ws=>{ws._socket.setNoDelay(true);
  ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}
   if(m.t==='p')return tx(ws,m);
   if(m.t==='create'){leave(ws);const c=newCode();rooms.set(c,[ws]);ws.room=c;tx(ws,{t:'room',code:c})}
   else if(m.t==='join'){leave(ws);const c=String(m.code||'').toUpperCase(),r=rooms.get(c);
    if(!r||r.length!==1)return tx(ws,{t:'err',m:'Sala não encontrada ou já cheia'});
    r.push(ws);ws.room=c;r.forEach((p,i)=>tx(p,{t:'start',side:i}))}
   else if(OK.includes(m.t)){if(m.t==='hit')m.d=Math.min(200,Math.max(0,+m.d||0));
    (rooms.get(ws.room)||[]).forEach(p=>{if(p!==ws)tx(p,m)})}});
  ws.on('close',()=>leave(ws))});
 srv.once('error',reject);
 srv.listen(port,()=>resolve({port:srv.address().port,close:()=>{try{wss.close();srv.close()}catch(e){}}}))})}

module.exports={start};
if(require.main===module)start(process.env.PORT||3000).then(s=>console.log('ARENA BET em http://localhost:'+s.port)).catch(e=>{console.error(e.message);process.exit(1)});
