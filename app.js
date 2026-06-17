import{STORE_SETTINGS,DEFAULTS,DAYNAMES,MONTHNAMES,esc,pad,toMin,toHHMM,fmtDur,fmtDelta,getMonday,isoWeek,isoWeekMonday,weekKey,dayOfYear,todayIndex,dailyTarget,computeWeekObj,easterMonday,frenchHolidays,parseTarget,validateBackup}from"./compute.js";
import{syncConnect,syncDisconnect,syncStatus,syncPull,syncPush,setSyncToast}from"./sync.js";

/* ---------- state ---------- */
let settings={...DEFAULTS};
let week={};
let mondayOffset=0;
let _rendered=false;
let _bound=false;

/* ---------- storage ---------- */
let _aggCache=null;
function invalidateAggCache(){_aggCache=null;}
function loadSettings(){try{const v=localStorage.getItem(STORE_SETTINGS);if(v)settings={...DEFAULTS,...JSON.parse(v)};}catch(e){settings={...DEFAULTS};}invalidateAggCache();}
function saveSettings(invalidate=true){try{localStorage.setItem(STORE_SETTINGS,JSON.stringify(settings));}catch(e){}if(invalidate)invalidateAggCache();}
function loadWeek(){week={};try{const v=localStorage.getItem(weekKey(mondayOffset));if(v)week=JSON.parse(v);}catch(e){week={};}}
function saveWeek(){try{localStorage.setItem(weekKey(mondayOffset),JSON.stringify(week));}catch(e){}invalidateAggCache();}

/* ---------- localStorage week iterator ---------- */
function forEachWeek(cb){
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);if(!k||!k.startsWith("pointeuse:week:"))continue;
    const m=k.match(/(\d{4})-W(\d{2})/);if(!m)continue;
    let w;try{w=JSON.parse(localStorage.getItem(k));}catch(e){continue;}
    cb({year:+m[1],wk:+m[2],data:w,monday:isoWeekMonday(+m[1],+m[2])});
  }
}

/* ---------- download helper ---------- */
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ---------- day computation ---------- */
function dayData(i){
  const d=week[i]||{};
  const status=d.status||"work";
  const arrival=d.arrival||"";
  const lunch=(d.lunch===0||d.lunch)?d.lunch:settings.lunch;
  const actual=d.actualDeparture||"";
  const aMin=toMin(arrival);
  const depMin=toMin(actual);
  const dt=dailyTarget(settings);
  let predicted=aMin!=null?aMin+dt+Number(lunch):null;
  const settled=aMin!=null&&depMin!=null;
  const dailyDelta=settled?(depMin-aMin-Number(lunch))-dt:null;
  let worked=null;
  if(aMin!=null){
    if(depMin!=null)worked=depMin-aMin-Number(lunch);
    else if(i===todayIndex(mondayOffset)){
      const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
      worked=Math.max(0,Math.min(nowMin,predicted)-aMin-Number(lunch));
    }
  }
  return{arrival,lunch:Number(lunch),actual,aMin,predicted,worked,settled,dailyDelta,status};
}

/* ---------- aggregation (cached) ---------- */
function _computeAgg(){
  if(_aggCache)return _aggCache;
  let total=0;const arr=[];
  forEachWeek(({year,wk,data,monday})=>{
    const c=computeWeekObj(data,settings);
    try{total+=c.settledDelta;}catch(e){console.warn("aggregation error for week",year,wk,e);}
    if(c.anyCount>0)arr.push({year,wk,monday,...c});
  });
  arr.sort((a,b)=>b.monday-a.monday);
  _aggCache={balance:total,history:arr};
  return _aggCache;
}
function cumulativeBalance(){return _computeAgg().balance;}
function historyWeeks(){return _computeAgg().history;}

/* ---------- unclosed days ---------- */
function unclosedPastDays(){
  const today=new Date();today.setHours(0,0,0,0);
  const thisMonday=getMonday(0);
  const results=[];
  forEachWeek(({year,wk,data,monday:mon})=>{
    const isPastWeek=mon<thisMonday;
    for(let d=0;d<7;d++){
      const entry=data[d];if(!entry)continue;
      const status=entry.status||"work";
      if(status!=="work")continue;
      if(!entry.arrival||entry.actualDeparture)continue;
      const date=new Date(mon);date.setDate(date.getDate()+d);date.setHours(0,0,0,0);
      if(date>=today)continue;
      results.push({year,wk,dayIdx:d,date,isPastWeek});
    }
  });
  results.sort((a,b)=>a.date-b.date);
  return results;
}

/* ---------- monthly recap ---------- */
function monthlyRecap(){
  const months={};
  const dt=dailyTarget(settings);
  forEachWeek(({data,monday:mon})=>{
    for(let d=0;d<7;d++){
      const entry=data[d];if(!entry)continue;
      const date=new Date(mon);date.setDate(date.getDate()+d);
      const mk=date.getFullYear()+"-"+pad(date.getMonth()+1);
      if(!months[mk])months[mk]={year:date.getFullYear(),month:date.getMonth(),worked:0,leave:0,holiday:0,sick:0,realized:0,delta:0,settledCount:0};
      const mo=months[mk];
      const status=entry.status||"work";
      if(status==="leave"){mo.leave++;continue;}
      if(status==="holiday"){mo.holiday++;continue;}
      if(status==="sick"){mo.sick++;continue;}
      const a=toMin(entry.arrival);if(a==null)continue;
      mo.worked++;
      const lunch=(entry.lunch===0||entry.lunch)?Number(entry.lunch):settings.lunch;
      const dep=toMin(entry.actualDeparture);
      if(dep!=null){const wk=dep-a-lunch;mo.realized+=wk;mo.delta+=wk-dt;mo.settledCount++;}
    }
  });
  return Object.values(months).sort((a,b)=>(b.year-a.year)||b.month-a.month);
}

/* ---------- CSV export ---------- */
function exportCSV(){
  const rows=["\uFEFFDate;Jour;Statut;Arriv\u00e9e;Pause (min);D\u00e9part pr\u00e9vu;D\u00e9part r\u00e9el;Travaill\u00e9;\u00c9cart"];
  const statusLabels={work:"travaill\u00e9",leave:"cong\u00e9",holiday:"f\u00e9ri\u00e9",sick:"maladie"};
  const dt=dailyTarget(settings);
  const allWeeks=[];
  forEachWeek(({year,wk,data})=>{allWeeks.push({year,wk,data});});
  allWeeks.sort((a,b)=>{const ma=isoWeekMonday(a.year,a.wk),mb=isoWeekMonday(b.year,b.wk);return ma-mb;});
  for(const wk of allWeeks){
    const mon=isoWeekMonday(wk.year,wk.wk);
    for(let d=0;d<7;d++){
      const entry=wk.data[d];if(!entry)continue;
      const date=new Date(mon);date.setDate(date.getDate()+d);
      const ds=date.toISOString().slice(0,10);
      const status=entry.status||"work";
      if(status!=="work"){rows.push(`${ds};${DAYNAMES[d]};${statusLabels[status]};;;;;;`);continue;}
      const a=toMin(entry.arrival);if(a==null)continue;
      const lunch=(entry.lunch===0||entry.lunch)?Number(entry.lunch):settings.lunch;
      const dep=toMin(entry.actualDeparture);
      const predicted=a+dt+lunch;
      const worked=dep!=null?dep-a-lunch:null;
      const delta=dep!=null?worked-dt:null;
      rows.push(`${ds};${DAYNAMES[d]};${statusLabels[status]};${toHHMM(a)};${lunch};${toHHMM(predicted)};${dep!=null?toHHMM(dep):""};${worked!=null?fmtDur(worked):""};${delta!=null?fmtDelta(delta):""}`);
    }
  }
  downloadBlob(new Blob([rows.join("\r\n")],{type:"text/csv;charset=utf-8"}),"pointeuse-export-"+new Date().toISOString().slice(0,10)+".csv");
  toast("CSV export\u00e9");
}

/* ---------- events ---------- */
let _renderTimer=null;
function cycleStatus(i){
  if(!week[i])week[i]={};
  const cur=week[i].status||"work";
  const next={work:"leave",leave:"holiday",holiday:"sick",sick:"work"};
  const ns=next[cur]||"work";
  week[i].status=ns;
  if(ns!=="work"){delete week[i].arrival;delete week[i].lunch;delete week[i].actualDeparture;}
  saveWeek();syncPush();_rendered=false;render();
}
function setField(i,k,v){
  if(!week[i])week[i]={};
  if(k==='lunch')v=v===""?0:Number(v);
  week[i][k]=v;
  saveWeek();syncPush();
  clearTimeout(_renderTimer);
  _renderTimer=setTimeout(()=>{
    const ae=document.activeElement;
    if(!ae||ae.tagName!=='INPUT'||!document.getElementById('app').contains(ae)){render();}
  },150);
}
function nav(d){mondayOffset+=d;loadWeek();_rendered=false;render();}
function goToday(){mondayOffset=0;loadWeek();_rendered=false;render();}
function goToWeekKey(year,wk){const m=isoWeekMonday(year,wk);mondayOffset=Math.round((m-getMonday(0))/(7*86400000));loadWeek();_rendered=false;render();window.scrollTo({top:0,behavior:"smooth"});}
function openHistory(){const h=document.getElementById("hist");if(h){h.open=true;h.scrollIntoView({behavior:"smooth",block:"center"});}}
function clearWeek(){if(!confirm("Effacer toutes les saisies de cette semaine ?"))return;week={};saveWeek();syncPush();_rendered=false;render();toast("Semaine effac\u00e9e");}
function setTarget(v){const parsed=parseTarget(v);settings.weeklyTarget=parsed!=null?parsed:settings.weeklyTarget;saveSettings();syncPush();_rendered=false;render();}
function setDays(v){settings.days=Math.max(1,Math.min(7,Number(v)||5));saveSettings();syncPush();_rendered=false;render();}
function setLunch(v){settings.lunch=Math.max(0,Number(v)||0);saveSettings();syncPush();_rendered=false;render();}
function setArr(v){settings.arrival=v||"08:15";saveSettings();syncPush();_rendered=false;render();}
function setIcsTitle(v){settings.icsTitle=v||DEFAULTS.icsTitle;saveSettings(false);syncPush();}
function setIcsLocation(v){settings.icsLocation=v||"";saveSettings(false);syncPush();}
function setIcsCal(v){settings.icsCalendar=v||"";saveSettings(false);syncPush();}
async function handleSyncConnect(){
  const input=document.getElementById("sync-token");
  if(!input||!input.value.trim()){toast("Token requis");return;}
  const ok=await syncConnect(input.value.trim());
  if(ok){toast("Synchronisation activ\u00e9e");_rendered=false;render();}
  else{toast("Token invalide");}
}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}

function prefillHolidays(year){
  const holidays=frenchHolidays(year);
  let count=0;
  for(const h of holidays){
    const dow=(h.getDay()+6)%7;
    if(dow>=settings.days)continue;
    const{week:wk,year:y}=isoWeek(h);
    const key=`pointeuse:week:${y}-W${pad(wk)}`;
    let wData={};
    try{const v=localStorage.getItem(key);if(v)wData=JSON.parse(v);}catch(e){}
    if(!wData[dow])wData[dow]={};
    if(wData[dow].status&&wData[dow].status!=="work")continue;
    wData[dow].status="holiday";
    localStorage.setItem(key,JSON.stringify(wData));
    count++;
  }
  invalidateAggCache();loadWeek();_rendered=false;render();syncPush();
  toast(count+" f\u00e9ri\u00e9(s) ajout\u00e9(s) pour "+year);
}

/* ---------- ICS ---------- */
function exportICS(){
  const monday=getMonday(mondayOffset);let ev="",count=0;
  for(let i=0;i<settings.days;i++){
    const d=dayData(i);if(d.aMin==null)continue;
    const dep=toMin(d.actual)!=null?toMin(d.actual):d.predicted;
    if(dep==null)continue;
    const date=new Date(monday);date.setDate(date.getDate()+i);
    const y=date.getFullYear(),mo=pad(date.getMonth()+1),da=pad(date.getDate());
    const st=`${y}${mo}${da}T${pad(Math.floor(d.aMin/60))}${pad(d.aMin%60)}00`;
    const en=`${y}${mo}${da}T${pad(Math.floor(dep/60))}${pad(dep%60)}00`;
    const loc=(settings.icsLocation||"").replace(/\\n/g,", ");
    ev+=`BEGIN:VEVENT\r\nUID:${y}${mo}${da}-pointeuse@josuerocha.dev\r\nDTSTART:${st}\r\nDTEND:${en}\r\nSUMMARY:${settings.icsTitle||"Travail"}\r\n${loc?`LOCATION:${loc}\r\n`:""}DESCRIPTION:Pause ${d.lunch} min \u00b7 ${fmtDur(dep-d.aMin-d.lunch)} travaill\u00e9es\r\nEND:VEVENT\r\n`;count++;
  }
  if(!count){toast("Aucune arriv\u00e9e \u00e0 exporter");return;}
  const calName=settings.icsCalendar?`X-WR-CALNAME:${settings.icsCalendar}\r\n`:"";
  const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Pointeuse//FR\r\nCALSCALE:GREGORIAN\r\n${calName}${ev}END:VCALENDAR\r\n`;
  const{week:wn,year}=isoWeek(monday);
  downloadBlob(new Blob([ics],{type:"text/calendar"}),`travail-${year}-S${pad(wn)}.ics`);
  toast(`${count} journ\u00e9e(s) export\u00e9e(s)`);
}

/* ---------- backup ---------- */
function exportBackup(){
  const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith("pointeuse:"))o[k]=localStorage.getItem(k);}
  downloadBlob(new Blob([JSON.stringify(o,null,2)],{type:"application/json"}),"pointeuse-sauvegarde-"+new Date().toISOString().slice(0,10)+".json");
  toast("Sauvegarde t\u00e9l\u00e9charg\u00e9e");
}
function importBackup(file){
  if(!file)return;
  if(!confirm("Les donn\u00e9es actuelles seront remplac\u00e9es. Continuer ?"))return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const o=JSON.parse(r.result);
      if(!validateBackup(o)){toast("Fichier de sauvegarde invalide ou corrompu");return;}
      Object.keys(o).forEach(k=>{if(k.startsWith("pointeuse:"))localStorage.setItem(k,o[k]);});
      invalidateAggCache();loadSettings();loadWeek();_rendered=false;render();syncPush();toast("Donn\u00e9es restaur\u00e9es");
    }catch(e){toast("Fichier invalide");}
  };
  r.readAsText(file);
}

/* ---------- render ---------- */
function render(){
  const app=document.getElementById("app");
  if(!_rendered){
    _renderFull(app);
    _rendered=true;
    if(!_bound){_bindEvents(app);_bound=true;}
  } else {
    _renderUpdate(app);
  }
}

function _renderFull(app){
  const{week:wn}=isoWeek(getMonday(mondayOffset));
  const ti=todayIndex(mondayOffset);
  const heroIdx=ti>=0?ti:0;
  const hd=dayData(heroIdx);
  const heroDate=getMonday(mondayOffset);heroDate.setDate(heroDate.getDate()+heroIdx);
  const dateStr=heroDate.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})+", jour "+dayOfYear(heroDate);

  let fillPct=0,nowPct=null,over=false;
  if(hd.aMin!=null&&hd.predicted!=null){
    const span=hd.predicted-hd.aMin;
    if(ti===heroIdx){
      const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
      nowPct=Math.max(0,Math.min(1,(nowMin-hd.aMin)/span))*100;
      fillPct=nowPct;over=nowMin>hd.predicted;if(over)fillPct=100;
    }else if(hd.actual){fillPct=100;}
  }
  const heroLeave=hd.predicted!=null?toHHMM(hd.predicted):"\u2013\u2013:\u2013\u2013";

  const today=new Date();today.setHours(0,0,0,0);
  const viewMonday=getMonday(mondayOffset);

  let rows="";
  for(let i=0;i<settings.days;i++){
    const d=dayData(i);
    const dd=new Date(viewMonday);dd.setDate(dd.getDate()+i);dd.setHours(0,0,0,0);
    const isToday=i===ti;
    const isOff=d.status!=="work";
    const isUnclosed=d.status==="work"&&d.aMin!=null&&!d.actual&&dd<today;
    const badges={leave:`<span class="day-badge leave">cong\u00e9</span>`,holiday:`<span class="day-badge holiday">f\u00e9ri\u00e9</span>`,sick:`<span class="day-badge sick">maladie</span>`};
    const badgeHTML=badges[d.status]||"";
    rows+=`<div class="row${isToday?" today":""}${isOff?" off":""}" data-row="${i}">
      <div class="day" data-action="cycleStatus" data-arg="${i}" tabindex="0" role="button" aria-label="Changer statut ${DAYNAMES[i]}">${DAYNAMES[i].slice(0,3)}${isUnclosed?`<span class="unclosed-dot"></span>`:""}<small>${dd.getDate()}/${pad(dd.getMonth()+1)}</small><small class="quant">${dayOfYear(dd)}</small>${badgeHTML}</div>
      <input type="time" value="${esc(d.arrival)}" aria-label="Arriv\u00e9e ${DAYNAMES[i]}" data-field="arrival" data-idx="${i}">
      <div class="pause"><input type="number" min="0" max="180" value="${esc(d.lunch)}" aria-label="Pause ${DAYNAMES[i]}" data-field="lunch" data-idx="${i}"></div>
      <div class="prev ${d.predicted==null?'empty':''}" data-prev="${i}">${d.predicted!=null?toHHMM(d.predicted):"\u2014"}</div>
      <div class="realcell" data-realcell="${i}">
        <input type="time" value="${esc(d.actual)}" aria-label="D\u00e9part r\u00e9el ${DAYNAMES[i]}" data-field="actualDeparture" data-idx="${i}">
        ${d.settled?`<div class="ddelta ${d.dailyDelta>=0?'pos':'neg'}">${fmtDelta(d.dailyDelta)}</div>`:``}
      </div>
    </div>`;
  }

  const cw=computeWeekObj(week,settings);
  const showProj=cw.projected!==cw.realized;
  const wSolde=cw.settledCount>0?fmtDelta(cw.settledDelta):"\u2014";
  const wSoldeCls=cw.settledDelta>=0?"pos":"neg";

  const bal=cumulativeBalance();
  const balCls=bal>=0?"pos":"neg";

  const hist=historyWeeks();
  let histHTML=hist.length?`<div class="hist">`+hist.map(h=>{
    const end=new Date(h.monday);end.setDate(end.getDate()+settings.days-1);
    const rng=h.monday.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" \u2013 "+end.toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
    const dcls=h.settledDelta>=0?"pos":"neg";
    return `<div class="hrow" data-action="goToWeekKey" data-year="${h.year}" data-wk="${h.wk}">
      <div class="hr-date">Semaine ${h.wk}<small>${rng}</small></div>
      <div class="hr-tot">${fmtDur(h.realized)}</div>
      <div class="hr-d ${dcls}">${h.settledCount?fmtDelta(h.settledDelta):"\u2014"}</div>
    </div>`;
  }).join("")+`</div>`:`<div class="hempty">Aucune semaine enregistr\u00e9e pour l\u2019instant.</div>`;

  const dt=dailyTarget(settings);

  app.innerHTML=`
  <div class="top">
    <div class="brand"><b>Pointeuse</b><span data-weeknum>sem. ${wn}</span></div>
    <div class="weeknav">
      <button data-action="nav" data-arg="-1" aria-label="Semaine pr\u00e9c\u00e9dente">\u2039</button>
      ${mondayOffset!==0?`<button class="today" data-action="goToday" aria-label="Retour \u00e0 cette semaine">aujourd\u2019hui</button>`:`<span class="lbl">cette semaine</span>`}
      <button data-action="nav" data-arg="1" aria-label="Semaine suivante">\u203A</button>
    </div>
  </div>

  <div class="balance" data-action="openHistory" tabindex="0" role="button" aria-label="Voir l'historique \u2014 solde cumul\u00e9 ${fmtDelta(bal)}">
    <div class="l">Solde cumul\u00e9<small>avance / retard, tous jours cl\u00f4tur\u00e9s</small></div>
    <b data-bal class="${balCls}">${fmtDelta(bal)}</b>
  </div>

  ${(()=>{
    const uc=unclosedPastDays().filter(u=>u.isPastWeek);
    if(!uc.length)return"";
    const label=uc.length===1?"1 jour non cl\u00f4tur\u00e9":uc.length+" jours non cl\u00f4tur\u00e9s";
    const dates=uc.slice(0,5).map(u=>DAYNAMES[u.dayIdx].slice(0,3)+" "+u.date.getDate()+"/"+ pad(u.date.getMonth()+1)).join(", ")+(uc.length>5?"...":"");
    return`<div class="warn" data-action="goToWeekKey" data-year="${uc[0].year}" data-wk="${uc[0].wk}" role="alert"><div class="wico">\u26A0</div><div class="wtxt"><b>${label}</b> \u2014 ${dates}</div></div>`;
  })()}
  <div class="hero">
    <div class="eyebrow">${ti>=0?"Aujourd\u2019hui":"Aper\u00e7u \u2014 "+DAYNAMES[heroIdx]}</div>
    <div class="date">${dateStr}</div>
    <div class="leaverow">
      <div><div class="lab">D\u00e9part pr\u00e9vu</div><div class="bigtime ${over?'over':''}" data-hero-leave>${heroLeave}</div></div>
      <div class="quick"><label>Arriv\u00e9e</label><input type="time" value="${esc(hd.arrival)}" aria-label="Arriv\u00e9e aujourd'hui" data-field="heroArrival" data-idx="${heroIdx}"></div>
    </div>
    <div class="timeline">
      <div class="bar" role="progressbar" aria-valuenow="${Math.round(fillPct)}" aria-valuemin="0" aria-valuemax="100"><div class="fill ${over?'over':''}" data-fill style="width:${fillPct}%"></div><div class="now" data-now style="left:${nowPct!=null?nowPct:0}%;display:${nowPct!=null?'block':'none'}"></div></div>
      <div class="ticks">
        <span>${hd.aMin!=null?toHHMM(hd.aMin):"arriv\u00e9e"}</span>
        <span data-hero-worked>pause ${hd.lunch} min \u00b7 fait <b>${fmtDur(hd.worked)}</b></span>
        <span>${heroLeave}</span>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Semaine</h2>
    <div class="head" role="row"><span></span><span>Arriv\u00e9e</span><span>Pause</span><span>Pr\u00e9vu</span><span>R\u00e9el \u00b7 \u00e9cart</span></div>
    ${rows}
    <div class="sum">
      <div>
        <div class="lab">R\u00e9alis\u00e9 cette semaine</div>
        <div class="val" data-week-realized>${fmtDur(cw.realized)}${showProj?`<small>projet\u00e9 ${fmtDur(cw.projected)}</small>`:``}</div>
      </div>
      <div class="soldebox">
        <div class="lab">Solde semaine</div>
        <div class="sval ${wSoldeCls}" data-week-solde>${wSolde}</div>
      </div>
    </div>
  </div>

  <div class="actions">
    <button class="btn btn-primary" data-action="exportICS">\u2913 Exporter vers Calendar</button>
    <button class="btn btn-ghost" data-action="clearWeek">Effacer la semaine</button>
  </div>
  <div class="actions" style="margin-top:8px">
    <button class="btn btn-ghost" data-action="exportBackup">\u2913 Sauvegarder</button>
    <button class="btn btn-ghost" data-action="importTrigger">Restaurer</button>
  </div>

  <details class="panel" id="hist">
    <summary>\uD83D\uDCC5 Historique par semaine</summary>
    ${histHTML}
  </details>

  <details class="panel">
    <summary>\uD83D\uDCCA R\u00e9cap mensuel</summary>
    ${(()=>{
      const mr=monthlyRecap();
      if(!mr.length)return`<div class="hempty">Aucune donn\u00e9e mensuelle.</div>`;
      let html=`<div class="hist">`;
      for(const m of mr){
        const parts=[];
        if(m.worked)parts.push(m.worked+"j travaill\u00e9"+(m.worked>1?"s":""));
        if(m.leave)parts.push(m.leave+" cong\u00e9"+(m.leave>1?"s":""));
        if(m.holiday)parts.push(m.holiday+" f\u00e9ri\u00e9"+(m.holiday>1?"s":""));
        if(m.sick)parts.push(m.sick+" maladie");
        const detail=parts.join(" \u00b7 ")+(m.settledCount?" \u00b7 "+fmtDur(m.realized):"");
        const dcls=m.delta>=0?"pos":"neg";
        html+=`<div class="mrow"><div class="mr-label">${MONTHNAMES[m.month]} ${m.year}<small>${detail}</small></div><div class="mr-solde ${dcls}">${m.settledCount?fmtDelta(m.delta):"\u2014"}</div></div>`;
      }
      html+=`</div>`;
      html+=`<div style="padding:12px 18px;border-top:1px solid #232E3A"><button class="btn btn-ghost" style="flex:none;width:100%" data-action="exportCSV">\u2913 Exporter CSV (tous les jours)</button></div>`;
      return html;
    })()}
  </details>

  <details class="panel">
    <summary>\u2699 R\u00e9glages</summary>
    <div class="setgrid">
      <div class="f"><label>Objectif hebdo</label><input type="text" value="${fmtDur(settings.weeklyTarget)}" aria-label="Objectif hebdomadaire" data-field="weeklyTarget"></div>
      <div class="f"><label>Jours / semaine</label><input type="number" min="1" max="7" value="${settings.days}" aria-label="Jours par semaine" data-field="days"></div>
      <div class="f"><label>Pause par d\u00e9faut (min)</label><input type="number" min="0" max="180" value="${esc(settings.lunch)}" aria-label="Pause par d\u00e9faut en minutes" data-field="defaultLunch"></div>
      <div class="f"><label>Arriv\u00e9e par d\u00e9faut</label><input type="time" value="${esc(settings.arrival)}" aria-label="Arriv\u00e9e par d\u00e9faut" data-field="defaultArrival"></div>
      <div class="sethint">Cible quotidienne : <b>${fmtDur(dt)}</b> de travail effectif. Le solde ne compte que les jours avec un <b>d\u00e9part r\u00e9el</b> \u2014 les cong\u00e9s restent neutres.</div>
      <div class="f" style="grid-column:1/-1"><label>Titre calendrier</label><input type="text" value="${esc(settings.icsTitle||"")}" placeholder="Travail" data-field="icsTitle"></div>
      <div class="f" style="grid-column:1/-1"><label>Lieu calendrier</label><input type="text" value="${esc((settings.icsLocation||"").replace(/\\\\n/g,", "))}" placeholder="Adresse" data-field="icsLocation"></div>
      <div class="f" style="grid-column:1/-1"><label>Calendrier cible</label><input type="text" value="${esc(settings.icsCalendar||"")}" placeholder="Professionnel" data-field="icsCalendar"></div>
      <div class="sethint" style="margin-top:8px"><button class="btn btn-ghost" style="flex:none;width:100%;margin-top:6px" data-action="prefillHolidays" data-arg="${new Date().getFullYear()}">Charger les jours f\u00e9ri\u00e9s ${new Date().getFullYear()}</button><button class="btn btn-ghost" style="flex:none;width:100%;margin-top:6px" data-action="prefillHolidays" data-arg="${new Date().getFullYear()+1}">Charger les jours f\u00e9ri\u00e9s ${new Date().getFullYear()+1}</button></div>
      <div class="sync-section">
        <label style="display:block;margin-bottom:8px">SYNCHRONISATION</label>
        ${(()=>{
          const st=syncStatus();
          if(st.connected){
            const d=st.lastSync?new Date(st.lastSync).toLocaleString("fr-FR"):"jamais";
            return`<div class="sync-row"><div><div class="sync-badge">Synchronis\u00e9</div><small>Dernier sync : ${d}</small></div><button class="btn btn-ghost" style="flex:none;padding:8px 14px" data-action="syncDisconnect">D\u00e9connecter</button></div>`;
          }
          return`<div class="sync-connect"><input type="password" id="sync-token" placeholder="Token GitHub (scope gist)" aria-label="Token GitHub"><button class="btn btn-primary" style="flex:none;padding:8px 14px" data-action="syncConnect">Connecter</button></div><div class="sethint" style="margin-top:6px">Cr\u00e9er un token sur GitHub \u2192 Settings \u2192 Developer settings \u2192 Personal access tokens. Scope : <b>gist</b> uniquement.</div>`;
        })()}
      </div>
    </div>
  </details>`;
}

/* ---------- event delegation ---------- */
function _bindEvents(app){
  app.addEventListener("click",e=>{
    const btn=e.target.closest("[data-action]");
    if(!btn)return;
    e.preventDefault();
    const action=btn.dataset.action;
    const arg=btn.dataset.arg;
    switch(action){
      case"nav":nav(Number(arg));break;
      case"goToday":goToday();break;
      case"cycleStatus":cycleStatus(Number(arg));break;
      case"openHistory":openHistory();break;
      case"exportICS":exportICS();break;
      case"clearWeek":clearWeek();break;
      case"exportBackup":exportBackup();break;
      case"importTrigger":document.getElementById("imp").click();break;
      case"exportCSV":exportCSV();break;
      case"prefillHolidays":prefillHolidays(Number(arg));break;
      case"syncConnect":handleSyncConnect();break;
      case"syncDisconnect":handleSyncDisconnect();break;
      case"goToWeekKey":goToWeekKey(Number(btn.dataset.year),Number(btn.dataset.wk));break;
    }
  });

  app.addEventListener("change",e=>{
    const input=e.target.closest("[data-field]");
    if(!input)return;
    const field=input.dataset.field;
    const idx=input.dataset.idx;
    switch(field){
      case"arrival":case"actualDeparture":case"lunch":
        setField(Number(idx),field,input.value);break;
      case"heroArrival":
        setField(Number(idx),"arrival",input.value);break;
      case"weeklyTarget":setTarget(input.value);break;
      case"days":setDays(input.value);break;
      case"defaultLunch":setLunch(input.value);break;
      case"defaultArrival":setArr(input.value);break;
      case"icsTitle":setIcsTitle(input.value);break;
      case"icsLocation":setIcsLocation(input.value.replace(/, /g,"\\n"));break;
      case"icsCalendar":setIcsCal(input.value);break;
    }
  });

  app.addEventListener("blur",e=>{
    const input=e.target.closest("[data-field]");
    if(!input)return;
    const field=input.dataset.field;
    const idx=input.dataset.idx;
    if(field==="arrival"||field==="actualDeparture"||field==="lunch"||field==="heroArrival"){
      const actualField=field==="heroArrival"?"arrival":field;
      setField(Number(idx),actualField,input.value);
    }
    if(field==="icsTitle")setIcsTitle(input.value);
    if(field==="icsLocation")setIcsLocation(input.value.replace(/, /g,"\\n"));
    if(field==="icsCalendar")setIcsCal(input.value);
  },true);

  app.addEventListener("keydown",e=>{
    const btn=e.target.closest("[data-action]");
    if(!btn)return;
    if(e.key==="Enter"||e.key===" "){e.preventDefault();btn.click();}
  });

  document.getElementById("imp").addEventListener("change",function(){importBackup(this.files[0]);this.value="";});
}

function _renderUpdate(app){
  const ti=todayIndex(mondayOffset);
  const heroIdx=ti>=0?ti:0;
  const hd=dayData(heroIdx);

  /* --- hero section --- */
  let fillPct=0,nowPct=null,over=false;
  if(hd.aMin!=null&&hd.predicted!=null){
    const span=hd.predicted-hd.aMin;
    if(ti===heroIdx){
      const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
      nowPct=Math.max(0,Math.min(1,(nowMin-hd.aMin)/span))*100;
      fillPct=nowPct;over=nowMin>hd.predicted;if(over)fillPct=100;
    }else if(hd.actual){fillPct=100;}
  }
  const heroLeave=hd.predicted!=null?toHHMM(hd.predicted):"\u2013\u2013:\u2013\u2013";

  const elHeroLeave=app.querySelector("[data-hero-leave]");
  if(elHeroLeave){elHeroLeave.textContent=heroLeave;elHeroLeave.className="bigtime"+(over?" over":"");}

  const elHeroWorked=app.querySelector("[data-hero-worked]");
  if(elHeroWorked){elHeroWorked.innerHTML=`pause ${hd.lunch} min \u00b7 fait <b>${fmtDur(hd.worked)}</b>`;}

  const elFill=app.querySelector("[data-fill]");
  if(elFill){elFill.style.width=fillPct+"%";elFill.className="fill"+(over?" over":"");}

  const elNow=app.querySelector("[data-now]");
  if(elNow){
    if(nowPct!=null){elNow.style.left=nowPct+"%";elNow.style.display="block";}
    else{elNow.style.display="none";}
  }

  const elBar=app.querySelector(".bar[role=progressbar]");
  if(elBar)elBar.setAttribute("aria-valuenow",String(Math.round(fillPct)));

  /* --- balance --- */
  const bal=cumulativeBalance();
  const elBal=app.querySelector("[data-bal]");
  if(elBal){elBal.textContent=fmtDelta(bal);elBal.className=bal>=0?"pos":"neg";}

  /* --- day rows --- */
  for(let i=0;i<settings.days;i++){
    const d=dayData(i);

    const elPrev=app.querySelector(`[data-prev="${i}"]`);
    if(elPrev){
      elPrev.textContent=d.predicted!=null?toHHMM(d.predicted):"\u2014";
      elPrev.className="prev"+(d.predicted==null?" empty":"");
    }

    const elReal=app.querySelector(`[data-realcell="${i}"]`);
    if(elReal){
      const ddeltaEl=elReal.querySelector(".ddelta");
      if(d.settled){
        const cls="ddelta "+(d.dailyDelta>=0?"pos":"neg");
        const txt=fmtDelta(d.dailyDelta);
        if(ddeltaEl){ddeltaEl.className=cls;ddeltaEl.textContent=txt;}
        else{const div=document.createElement("div");div.className=cls;div.textContent=txt;elReal.appendChild(div);}
      }else{
        if(ddeltaEl)ddeltaEl.remove();
      }
    }
  }

  /* --- week summary --- */
  const cw=computeWeekObj(week,settings);
  const showProj=cw.projected!==cw.realized;

  const elRealized=app.querySelector("[data-week-realized]");
  if(elRealized){elRealized.innerHTML=fmtDur(cw.realized)+(showProj?`<small>projet\u00e9 ${fmtDur(cw.projected)}</small>`:``); }

  const wSolde=cw.settledCount>0?fmtDelta(cw.settledDelta):"\u2014";
  const wSoldeCls=cw.settledDelta>=0?"pos":"neg";
  const elSolde=app.querySelector("[data-week-solde]");
  if(elSolde){elSolde.textContent=wSolde;elSolde.className="sval "+wSoldeCls;}
}

function handleSyncDisconnect(){if(!confirm("D\u00e9connecter la synchronisation ?"))return;syncDisconnect();_rendered=false;render();}

/* ---------- service worker ---------- */
let _waitingSW=null;
function applyUpdate(){if(_waitingSW){_waitingSW.postMessage('SKIP_WAITING');}}
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    function onNewSW(sw){
      _waitingSW=sw;
      const b=document.createElement('div');
      b.className='sw-update';
      b.textContent='Mise \u00e0 jour disponible ';
      const btn=document.createElement('button');btn.textContent='Recharger';btn.addEventListener('click',applyUpdate);b.appendChild(btn);
      document.body.appendChild(b);
    }
    if(reg.waiting)onNewSW(reg.waiting);
    reg.addEventListener('updatefound',()=>{
      const nw=reg.installing;if(!nw)return;
      nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller)onNewSW(nw);});
    });
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
}

/* ---------- init ---------- */
loadSettings();loadWeek();
setSyncToast(toast);
syncPull().then(({changed,error})=>{
  if(error)toast(error);
  if(changed){invalidateAggCache();loadSettings();loadWeek();_rendered=false;}
  render();
});
