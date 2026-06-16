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

async function _findOrCleanGists(token){
  const listRes=await fetch(GIST_API+"?per_page=100",{headers:_headers(token)});
  if(!listRes.ok)return null;
  const gists=await listRes.json();
  const matches=gists.filter(g=>g.description==="pointeuse-sync"&&g.files&&g.files["pointeuse-sync.json"]);
  if(!matches.length)return null;
  // Keep the most recently updated, delete duplicates
  matches.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  const keep=matches[0];
  for(let i=1;i<matches.length;i++){
    fetch(GIST_API+"/"+matches[i].id,{method:"DELETE",headers:_headers(token)}).catch(()=>{});
  }
  return keep;
}

export async function syncConnect(token){
  const existing=await _findOrCleanGists(token);
  if(existing===null){
    // Validate token with a simple GET
    const check=await fetch(GIST_API+"?per_page=1",{headers:_headers(token)});
    if(!check.ok)return false;
  }
  if(existing){
    _saveSyncConf({token,gistId:existing.id,lastSync:0});
    const changed=await syncPull();
    syncPush();
    return true;
  }
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

export function syncDisconnect(){
  localStorage.removeItem(SYNC_KEY);
}

export function syncStatus(){
  const c=_syncConf();
  return{connected:!!(c.token&&c.gistId),lastSync:c.lastSync||null};
}

/** @returns {{changed:boolean, error:string|null}} */
export async function syncPull(){
  const conf=_syncConf();
  if(!conf.token||!conf.gistId)return{changed:false,error:null};
  let res;
  try{res=await fetch(GIST_API+"/"+conf.gistId,{headers:_headers(conf.token)});}catch(e){return{changed:false,error:null};}
  if(res.status===401){
    localStorage.removeItem(SYNC_KEY);
    return{changed:false,error:"Token sync invalide"};
  }
  if(res.status===404){
    conf.gistId=null;_saveSyncConf(conf);
    return{changed:false,error:null};
  }
  if(!res.ok)return{changed:false,error:null};
  const gist=await res.json();
  const file=gist.files&&gist.files["pointeuse-sync.json"];
  if(!file||!file.content)return{changed:false,error:null};
  let remote;
  try{remote=JSON.parse(file.content);}catch(e){return{changed:false,error:null};}
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
  return{changed,error:null};
}

let _doPushFn=null;

export function syncPush(){
  clearTimeout(_pushTimer);
  _pushTimer=setTimeout(()=>{if(_doPushFn)_doPushFn();else _doPushDefault();},SYNC_DEBOUNCE);
}

/** Allow app.js to provide a toast callback for push errors */
export function setSyncToast(fn){_doPushFn=fn?_makePush(fn):null;}

function _makePush(toastFn){
  return async function(){
    await _doPushCore(toastFn);
  };
}

async function _doPushDefault(){await _doPushCore(()=>{});}

async function _doPushCore(toastFn){
  const conf=_syncConf();
  if(!conf.token)return;
  const content=JSON.stringify(_allPointeuseKeys(),null,2);
  if(!conf.gistId){
    // Search for existing gist before creating a new one
    const existing=await _findOrCleanGists(conf.token);
    if(existing){
      conf.gistId=existing.id;_saveSyncConf(conf);
      // Fall through to PATCH below
    }else{
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
  }
  const body={files:{"pointeuse-sync.json":{content}}};
  try{
    const res=await fetch(GIST_API+"/"+conf.gistId,{method:"PATCH",headers:_headers(conf.token),body:JSON.stringify(body)});
    if(res.status===401){
      localStorage.removeItem(SYNC_KEY);
      toastFn("Token sync invalide");
      return;
    }
    if(res.status===404){
      conf.gistId=null;_saveSyncConf(conf);
      await _doPushCore(toastFn);
      return;
    }
    if(res.status===403){
      toastFn("Trop de requ\u00eates, r\u00e9essai dans 1 min");
      return;
    }
    if(res.ok){
      conf.lastSync=Date.now();
      _saveSyncConf(conf);
    }
  }catch(e){/* offline */}
}
