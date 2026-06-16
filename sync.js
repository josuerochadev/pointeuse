/* ---------- sync via GitHub Gist ---------- */
const SYNC_KEY="pointeuse:sync";
const GIST_API="https://api.github.com/gists";
const SYNC_DEBOUNCE=2000;

let _pushTimer=null;

function _syncConf(){
  try{return JSON.parse(localStorage.getItem(SYNC_KEY))||{};}catch(e){return{};}
}
function _saveSyncConf(conf){
  localStorage.setItem(SYNC_KEY,JSON.stringify(conf));
}
function _headers(token){
  return{Authorization:"Bearer "+token,Accept:"application/vnd.github+json"};
}
function _allPointeuseKeys(){
  const out={};const now=Date.now();
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith("pointeuse:")||k===SYNC_KEY)continue;
    out[k]={value:localStorage.getItem(k),ts:now};
  }
  return out;
}

async function syncConnect(token){
  // Search for existing pointeuse-sync gist
  const listRes=await fetch(GIST_API+"?per_page=100",{headers:_headers(token)});
  if(!listRes.ok)return false;
  const gists=await listRes.json();
  const existing=gists.find(g=>g.description==="pointeuse-sync"&&g.files&&g.files["pointeuse-sync.json"]);
  if(existing){
    // Reuse existing gist — pull remote data then merge
    _saveSyncConf({token,gistId:existing.id,lastSync:0});
    await syncPull();
    syncPush();
    return true;
  }
  // No existing gist — create one
  const body={
    description:"pointeuse-sync",
    public:false,
    files:{"pointeuse-sync.json":{content:JSON.stringify(_allPointeuseKeys(),null,2)}}
  };
  const res=await fetch(GIST_API,{method:"POST",headers:_headers(token),body:JSON.stringify(body)});
  if(!res.ok)return false;
  const gist=await res.json();
  _saveSyncConf({token,gistId:gist.id,lastSync:Date.now()});
  return true;
}

function syncDisconnect(){
  localStorage.removeItem(SYNC_KEY);
}

function syncStatus(){
  const c=_syncConf();
  return{connected:!!(c.token&&c.gistId),lastSync:c.lastSync||null};
}

async function syncPull(){
  const conf=_syncConf();
  if(!conf.token||!conf.gistId)return;
  let res;
  try{res=await fetch(GIST_API+"/"+conf.gistId,{headers:_headers(conf.token)});}catch(e){return;}
  if(res.status===401){
    localStorage.removeItem(SYNC_KEY);
    if(typeof toast==="function")toast("Token sync invalide");
    return;
  }
  if(res.status===404){
    conf.gistId=null;_saveSyncConf(conf);
    return;
  }
  if(!res.ok)return;
  const gist=await res.json();
  const file=gist.files&&gist.files["pointeuse-sync.json"];
  if(!file||!file.content)return;
  let remote;
  try{remote=JSON.parse(file.content);}catch(e){return;}
  let changed=false;
  for(const[k,rv]of Object.entries(remote)){
    if(!k.startsWith("pointeuse:")||k===SYNC_KEY)continue;
    const localVal=localStorage.getItem(k);
    if(localVal===null||rv.ts>(conf.lastSync||0)){
      localStorage.setItem(k,rv.value);
      changed=true;
    }
  }
  conf.lastSync=Date.now();
  _saveSyncConf(conf);
  if(changed&&typeof loadSettings==="function"){
    loadSettings();loadWeek();render();
  }
}

function syncPush(){
  clearTimeout(_pushTimer);
  _pushTimer=setTimeout(_doPush,SYNC_DEBOUNCE);
}

async function _doPush(){
  const conf=_syncConf();
  if(!conf.token)return;
  const content=JSON.stringify(_allPointeuseKeys(),null,2);
  if(!conf.gistId){
    const body={
      description:"pointeuse-sync",
      public:false,
      files:{"pointeuse-sync.json":{content}}
    };
    let res;
    try{res=await fetch(GIST_API,{method:"POST",headers:_headers(conf.token),body:JSON.stringify(body)});}catch(e){return;}
    if(!res.ok)return;
    const gist=await res.json();
    conf.gistId=gist.id;conf.lastSync=Date.now();
    _saveSyncConf(conf);
    return;
  }
  const body={files:{"pointeuse-sync.json":{content}}};
  try{
    const res=await fetch(GIST_API+"/"+conf.gistId,{method:"PATCH",headers:_headers(conf.token),body:JSON.stringify(body)});
    if(res.status===401){
      localStorage.removeItem(SYNC_KEY);
      if(typeof toast==="function")toast("Token sync invalide");
      return;
    }
    if(res.status===404){
      conf.gistId=null;_saveSyncConf(conf);
      _doPush();
      return;
    }
    if(res.status===403){
      if(typeof toast==="function")toast("Trop de requ\u00eates, r\u00e9essai dans 1 min");
      return;
    }
    if(res.ok){
      conf.lastSync=Date.now();
      _saveSyncConf(conf);
    }
  }catch(e){/* offline */}
}
