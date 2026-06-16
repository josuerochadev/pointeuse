const STORE_SETTINGS="pointeuse:settings";
const DEFAULTS={weeklyTarget:2340,days:5,lunch:45,arrival:"08:15",icsTitle:"Travail \u2014 Euro-Information",icsLocation:"Wacken, Strasbourg\\n17 Boulevard de Dresde\\n67000 Strasbourg\\nFrance",icsCalendar:"Professionnel"};
const DAYNAMES=["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];

let settings={...DEFAULTS};
let week={};
let mondayOffset=0;

/* ---------- time helpers ---------- */
const pad=n=>String(n).padStart(2,"0");
function toMin(hhmm){if(!hhmm)return null;const[h,m]=hhmm.split(":").map(Number);return h*60+m;}
function toHHMM(min){min=((min%1440)+1440)%1440;return pad(Math.floor(min/60))+":"+pad(min%60);}
function fmtDur(min){if(min==null)return"\u2014";const s=min<0?"-":"";min=Math.abs(min);return s+Math.floor(min/60)+"h"+pad(Math.round(min%60));}
function fmtDelta(min){if(min==null)return"\u2014";if(Math.round(min)===0)return"0h00";const s=min>0?"+":"\u2212";min=Math.abs(min);return s+Math.floor(min/60)+"h"+pad(Math.round(min%60));}
function getMonday(off=0){const d=new Date();const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day+off*7);d.setHours(0,0,0,0);return d;}
function isoWeek(d){const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()+3-((t.getDay()+6)%7));const w1=new Date(t.getFullYear(),0,4);return{week:1+Math.round(((t-w1)/864e5-3+((w1.getDay()+6)%7))/7),year:t.getFullYear()};}
function isoWeekMonday(year,wk){const jan4=new Date(year,0,4);const day=(jan4.getDay()+6)%7;const w1=new Date(jan4);w1.setDate(jan4.getDate()-day);const m=new Date(w1);m.setDate(w1.getDate()+(wk-1)*7);m.setHours(0,0,0,0);return m;}
function weekKey(off){const m=getMonday(off);const{week,year}=isoWeek(m);return`pointeuse:week:${year}-W${pad(week)}`;}
function todayIndex(off){if(off!==0)return -1;return (new Date().getDay()+6)%7;}
function dailyTarget(){return Math.round(settings.weeklyTarget/settings.days);}

/* ---------- storage ---------- */
function loadSettings(){try{const v=localStorage.getItem(STORE_SETTINGS);if(v)settings={...DEFAULTS,...JSON.parse(v)};}catch(e){settings={...DEFAULTS};}}
function saveSettings(){try{localStorage.setItem(STORE_SETTINGS,JSON.stringify(settings));}catch(e){}}
function loadWeek(){week={};try{const v=localStorage.getItem(weekKey(mondayOffset));if(v)week=JSON.parse(v);}catch(e){week={};}}
function saveWeek(){try{localStorage.setItem(weekKey(mondayOffset),JSON.stringify(week));}catch(e){}}

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

/* ---------- computation ---------- */
function dayData(i){
  const d=week[i]||{};
  const status=d.status||"work";
  const arrival=d.arrival||"";
  const lunch=(d.lunch===0||d.lunch)?d.lunch:settings.lunch;
  const actual=d.actualDeparture||"";
  const aMin=toMin(arrival);
  const depMin=toMin(actual);
  let predicted=aMin!=null?aMin+dailyTarget()+Number(lunch):null;
  const settled=aMin!=null&&depMin!=null;
  const dailyDelta=settled?(depMin-aMin-Number(lunch))-dailyTarget():null;
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
function cycleStatus(i){
  if(!week[i])week[i]={};
  const cur=week[i].status||"work";
  const next={work:"leave",leave:"holiday",holiday:"sick",sick:"work"};
  const ns=next[cur]||"work";
  week[i].status=ns;
  if(ns!=="work"){delete week[i].arrival;delete week[i].lunch;delete week[i].actualDeparture;}
  saveWeek();syncPush();render();
}

/* ---------- french public holidays ---------- */
function easterMonday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100;
  const d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31)-1;
  const day=((h+l-7*m+114)%31)+1;
  return new Date(year,month,day+1);
}
function frenchHolidays(year){
  const em=easterMonday(year);
  const asc=new Date(em);asc.setDate(asc.getDate()+38);
  const pent=new Date(em);pent.setDate(pent.getDate()+49);
  return[
    new Date(year,0,1),
    em,
    new Date(year,4,1),
    new Date(year,4,8),
    asc,
    pent,
    new Date(year,6,14),
    new Date(year,7,15),
    new Date(year,10,1),
    new Date(year,10,11),
    new Date(year,11,25),
  ];
}
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
  loadWeek();render();syncPush();
  toast(count+" f\u00e9ri\u00e9(s) ajout\u00e9(s) pour "+year);
}

// pure aggregation over a raw week object (used for current week + history)
function computeWeekObj(w){
  let realized=0,delta=0,settledCount=0,projected=0,anyCount=0;
  const n=Math.max(settings.days,7);
  for(let i=0;i<n;i++){
    const d=w[i];if(!d)continue;
    const a=toMin(d.arrival);if(a==null)continue;
    anyCount++;
    const lunch=(d.lunch===0||d.lunch)?Number(d.lunch):settings.lunch;
    const dep=toMin(d.actualDeparture);
    if(dep!=null){const wk=dep-a-lunch;realized+=wk;projected+=wk;settledCount++;delta+=wk-dailyTarget();}
    else projected+=dailyTarget();
  }
  return{realized,settledDelta:delta,settledCount,projected,anyCount};
}
function cumulativeBalance(){
  let total=0;
  forEachWeek(({data})=>{
    try{total+=computeWeekObj(data).settledDelta;}catch(e){}
  });
  return total;
}
function historyWeeks(){
  const arr=[];
  forEachWeek(({year,wk,data,monday})=>{
    const c=computeWeekObj(data);if(c.anyCount===0)return;
    arr.push({year,wk,monday,...c});
  });
  arr.sort((a,b)=>b.monday-a.monday);
  return arr;
}

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
const MONTHNAMES=["janvier","f\u00e9vrier","mars","avril","mai","juin","juillet","ao\u00fbt","septembre","octobre","novembre","d\u00e9cembre"];
function monthlyRecap(){
  const months={};
  forEachWeek(({data,monday:mon})=>{
    for(let d=0;d<7;d++){
      const entry=data[d];if(!entry)continue;
      const date=new Date(mon);date.setDate(date.getDate()+d);
      const mk=date.getFullYear()+"-"+pad(date.getMonth()+1);
      if(!months[mk])months[mk]={year:date.getFullYear(),month:date.getMonth(),worked:0,leave:0,holiday:0,sick:0,realized:0,delta:0,settledCount:0};
      const mo=months[mk];
      const status=entry.status||"work";
      if(status==="leave"){mo.leave++;return;}
      if(status==="holiday"){mo.holiday++;return;}
      if(status==="sick"){mo.sick++;return;}
      const a=toMin(entry.arrival);if(a==null)return;
      mo.worked++;
      const lunch=(entry.lunch===0||entry.lunch)?Number(entry.lunch):settings.lunch;
      const dep=toMin(entry.actualDeparture);
      if(dep!=null){const wk=dep-a-lunch;mo.realized+=wk;mo.delta+=wk-dailyTarget();mo.settledCount++;}
    }
  });
  return Object.values(months).sort((a,b)=>(b.year-a.year)||b.month-a.month);
}

/* ---------- CSV export ---------- */
function exportCSV(){
  const rows=["\uFEFFDate;Jour;Statut;Arriv\u00e9e;Pause (min);D\u00e9part pr\u00e9vu;D\u00e9part r\u00e9el;Travaill\u00e9;\u00c9cart"];
  const statusLabels={work:"travaill\u00e9",leave:"cong\u00e9",holiday:"f\u00e9ri\u00e9",sick:"maladie"};
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
      const predicted=a+dailyTarget()+lunch;
      const worked=dep!=null?dep-a-lunch:null;
      const delta=dep!=null?worked-dailyTarget():null;
      rows.push(`${ds};${DAYNAMES[d]};${statusLabels[status]};${toHHMM(a)};${lunch};${toHHMM(predicted)};${dep!=null?toHHMM(dep):""};${worked!=null?fmtDur(worked):""};${delta!=null?fmtDelta(delta):""}`);
    }
  }
  downloadBlob(new Blob([rows.join("\r\n")],{type:"text/csv;charset=utf-8"}),"pointeuse-export-"+new Date().toISOString().slice(0,10)+".csv");
  toast("CSV export\u00e9");
}

/* ---------- render ---------- */
function render(){
  const app=document.getElementById("app");
  const{week:wn}=isoWeek(getMonday(mondayOffset));
  const ti=todayIndex(mondayOffset);
  const heroIdx=ti>=0?ti:0;
  const hd=dayData(heroIdx);
  const heroDate=getMonday(mondayOffset);heroDate.setDate(heroDate.getDate()+heroIdx);
  const dateStr=heroDate.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});

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

  // rows
  let rows="";
  for(let i=0;i<settings.days;i++){
    const d=dayData(i);
    const dd=new Date(viewMonday);dd.setDate(dd.getDate()+i);dd.setHours(0,0,0,0);
    const isToday=i===ti;
    const isOff=d.status!=="work";
    const isUnclosed=d.status==="work"&&d.aMin!=null&&!d.actual&&dd<today;
    const badges={leave:`<span class="day-badge leave">cong\u00e9</span>`,holiday:`<span class="day-badge holiday">f\u00e9ri\u00e9</span>`,sick:`<span class="day-badge sick">maladie</span>`};
    const badgeHTML=badges[d.status]||"";
    rows+=`<div class="row${isToday?" today":""}${isOff?" off":""}">
      <div class="day" onclick="cycleStatus(${i})" tabindex="0" role="button" aria-label="Changer statut ${DAYNAMES[i]}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cycleStatus(${i})}">${DAYNAMES[i].slice(0,3)}${isUnclosed?`<span class="unclosed-dot"></span>`:""}<small>${dd.getDate()}/${pad(dd.getMonth()+1)}</small>${badgeHTML}</div>
      <input type="time" value="${d.arrival}" aria-label="Arriv\u00e9e ${DAYNAMES[i]}" onblur="setField(${i},'arrival',this.value)">
      <div class="pause"><input type="number" min="0" max="180" value="${d.lunch}" aria-label="Pause ${DAYNAMES[i]}" onblur="setField(${i},'lunch',this.value)"></div>
      <div class="prev ${d.predicted==null?'empty':''}">${d.predicted!=null?toHHMM(d.predicted):"\u2014"}</div>
      <div class="realcell">
        <input type="time" value="${d.actual}" aria-label="D\u00e9part r\u00e9el ${DAYNAMES[i]}" onblur="setField(${i},'actualDeparture',this.value)">
        ${d.settled?`<div class="ddelta ${d.dailyDelta>=0?'pos':'neg'}">${fmtDelta(d.dailyDelta)}</div>`:``}
      </div>
    </div>`;
  }

  const cw=computeWeekObj(week);
  const showProj=cw.projected!==cw.realized;
  const wSolde=cw.settledCount>0?fmtDelta(cw.settledDelta):"\u2014";
  const wSoldeCls=cw.settledDelta>=0?"pos":"neg";

  const bal=cumulativeBalance();
  const balCls=bal>=0?"pos":"neg";

  // history
  const hist=historyWeeks();
  let histHTML=hist.length?`<div class="hist">`+hist.map(h=>{
    const end=new Date(h.monday);end.setDate(end.getDate()+settings.days-1);
    const rng=h.monday.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" \u2013 "+end.toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
    const dcls=h.settledDelta>=0?"pos":"neg";
    return `<div class="hrow" onclick="goToWeekKey(${h.year},${h.wk})">
      <div class="hr-date">Semaine ${h.wk}<small>${rng}</small></div>
      <div class="hr-tot">${fmtDur(h.realized)}</div>
      <div class="hr-d ${dcls}">${h.settledCount?fmtDelta(h.settledDelta):"\u2014"}</div>
    </div>`;
  }).join("")+`</div>`:`<div class="hempty">Aucune semaine enregistr\u00e9e pour l\u2019instant.</div>`;

  app.innerHTML=`
  <div class="top">
    <div class="brand"><b>Pointeuse</b><span>sem. ${wn}</span></div>
    <div class="weeknav">
      <button onclick="nav(-1)" aria-label="Semaine pr\u00e9c\u00e9dente">\u2039</button>
      ${mondayOffset!==0?`<button class="today" onclick="goToday()" aria-label="Retour \u00e0 cette semaine">aujourd\u2019hui</button>`:`<span class="lbl">cette semaine</span>`}
      <button onclick="nav(1)" aria-label="Semaine suivante">\u203A</button>
    </div>
  </div>

  <div class="balance" onclick="openHistory()" tabindex="0" role="button" aria-label="Voir l'historique \u2014 solde cumul\u00e9 ${fmtDelta(bal)}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openHistory()}">
    <div class="l">Solde cumul\u00e9<small>avance / retard, tous jours cl\u00f4tur\u00e9s</small></div>
    <b class="${balCls}">${fmtDelta(bal)}</b>
  </div>

  ${(()=>{
    const uc=unclosedPastDays().filter(u=>u.isPastWeek);
    if(!uc.length)return"";
    const label=uc.length===1?"1 jour non cl\u00f4tur\u00e9":uc.length+" jours non cl\u00f4tur\u00e9s";
    const dates=uc.slice(0,5).map(u=>DAYNAMES[u.dayIdx].slice(0,3)+" "+u.date.getDate()+"/"+ pad(u.date.getMonth()+1)).join(", ")+(uc.length>5?"...":"");
    return`<div class="warn" onclick="goToWeekKey(${uc[0].year},${uc[0].wk})" role="alert"><div class="wico">\u26A0</div><div class="wtxt"><b>${label}</b> \u2014 ${dates}</div></div>`;
  })()}
  <div class="hero">
    <div class="eyebrow">${ti>=0?"Aujourd\u2019hui":"Aper\u00e7u \u2014 "+DAYNAMES[heroIdx]}</div>
    <div class="date">${dateStr}</div>
    <div class="leaverow">
      <div><div class="lab">D\u00e9part pr\u00e9vu</div><div class="bigtime ${over?'over':''}">${heroLeave}</div></div>
      <div class="quick"><label>Arriv\u00e9e</label><input type="time" value="${hd.arrival}" aria-label="Arriv\u00e9e aujourd'hui" onchange="setField(${heroIdx},'arrival',this.value)"></div>
    </div>
    <div class="timeline">
      <div class="bar" role="progressbar" aria-valuenow="${Math.round(fillPct)}" aria-valuemin="0" aria-valuemax="100"><div class="fill ${over?'over':''}" style="width:${fillPct}%"></div>${nowPct!=null?`<div class="now" style="left:${nowPct}%"></div>`:""}</div>
      <div class="ticks">
        <span>${hd.aMin!=null?toHHMM(hd.aMin):"arriv\u00e9e"}</span>
        <span>pause ${hd.lunch} min \u00b7 fait <b>${fmtDur(hd.worked)}</b></span>
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
        <div class="val">${fmtDur(cw.realized)}${showProj?`<small>projet\u00e9 ${fmtDur(cw.projected)}</small>`:``}</div>
      </div>
      <div class="soldebox">
        <div class="lab">Solde semaine</div>
        <div class="sval ${wSoldeCls}">${wSolde}</div>
      </div>
    </div>
  </div>

  <div class="actions">
    <button class="btn btn-primary" onclick="exportICS()">\u2913 Exporter vers Calendar</button>
    <button class="btn btn-ghost" onclick="clearWeek()">Effacer la semaine</button>
  </div>
  <div class="actions" style="margin-top:8px">
    <button class="btn btn-ghost" onclick="exportBackup()">\u2913 Sauvegarder</button>
    <button class="btn btn-ghost" onclick="document.getElementById('imp').click()">Restaurer</button>
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
      html+=`<div style="padding:12px 18px;border-top:1px solid #232E3A"><button class="btn btn-ghost" style="flex:none;width:100%" onclick="exportCSV()">\u2913 Exporter CSV (tous les jours)</button></div>`;
      return html;
    })()}
  </details>

  <details class="panel">
    <summary>\u2699 R\u00e9glages</summary>
    <div class="setgrid">
      <div class="f"><label>Objectif hebdo</label><input type="text" value="${fmtDur(settings.weeklyTarget)}" aria-label="Objectif hebdomadaire" onchange="setTarget(this.value)"></div>
      <div class="f"><label>Jours / semaine</label><input type="number" min="1" max="7" value="${settings.days}" aria-label="Jours par semaine" onchange="setDays(this.value)"></div>
      <div class="f"><label>Pause par d\u00e9faut (min)</label><input type="number" min="0" max="180" value="${settings.lunch}" aria-label="Pause par d\u00e9faut en minutes" onchange="setLunch(this.value)"></div>
      <div class="f"><label>Arriv\u00e9e par d\u00e9faut</label><input type="time" value="${settings.arrival}" aria-label="Arriv\u00e9e par d\u00e9faut" onchange="setArr(this.value)"></div>
      <div class="sethint">Cible quotidienne : <b>${fmtDur(dailyTarget())}</b> de travail effectif. Le solde ne compte que les jours avec un <b>d\u00e9part r\u00e9el</b> \u2014 les cong\u00e9s restent neutres.</div>
      <div class="f" style="grid-column:1/-1"><label>Titre calendrier</label><input type="text" value="${settings.icsTitle||""}" placeholder="Travail" onblur="setIcsTitle(this.value)"></div>
      <div class="f" style="grid-column:1/-1"><label>Lieu calendrier</label><input type="text" value="${(settings.icsLocation||"").replace(/\\\\n/g,", ")}" placeholder="Adresse" onblur="setIcsLocation(this.value.replace(/, /g,'\\\\n'))"></div>
      <div class="f" style="grid-column:1/-1"><label>Calendrier cible</label><input type="text" value="${settings.icsCalendar||""}" placeholder="Professionnel" onblur="setIcsCal(this.value)"></div>
      <div class="sethint" style="margin-top:8px"><button class="btn btn-ghost" style="flex:none;width:100%;margin-top:6px" onclick="prefillHolidays(${new Date().getFullYear()})">Charger les jours f\u00e9ri\u00e9s ${new Date().getFullYear()}</button></div>
      <div class="sync-section">
        <label style="display:block;margin-bottom:8px">SYNCHRONISATION</label>
        ${(()=>{
          const st=syncStatus();
          if(st.connected){
            const d=st.lastSync?new Date(st.lastSync).toLocaleString("fr-FR"):"jamais";
            return`<div class="sync-row"><div><div class="sync-badge">Synchronis\u00e9</div><small>Dernier sync : ${d}</small></div><button class="btn btn-ghost" style="flex:none;padding:8px 14px" onclick="syncDisconnect();render()">D\u00e9connecter</button></div>`;
          }
          return`<div class="sync-connect"><input type="password" id="sync-token" placeholder="Token GitHub (scope gist)" aria-label="Token GitHub"><button class="btn btn-primary" style="flex:none;padding:8px 14px" onclick="handleSyncConnect()">Connecter</button></div><div class="sethint" style="margin-top:6px">Cr\u00e9er un token sur GitHub \u2192 Settings \u2192 Developer settings \u2192 Personal access tokens. Scope : <b>gist</b> uniquement.</div>`;
        })()}
      </div>
    </div>
  </details>`;
}

/* ---------- events ---------- */
let _renderTimer=null;
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
function nav(d){mondayOffset+=d;loadWeek();render();}
function goToday(){mondayOffset=0;loadWeek();render();}
function goToWeekKey(year,wk){const m=isoWeekMonday(year,wk);mondayOffset=Math.round((m-getMonday(0))/(7*86400000));loadWeek();render();window.scrollTo({top:0,behavior:"smooth"});}
function openHistory(){const h=document.getElementById("hist");if(h){h.open=true;h.scrollIntoView({behavior:"smooth",block:"center"});}}
function clearWeek(){if(!confirm("Effacer toutes les saisies de cette semaine ?"))return;week={};saveWeek();syncPush();render();toast("Semaine effac\u00e9e");}
function parseTarget(s){const m=s.match(/(\d+)\s*h\s*(\d+)?/i);if(m)return Number(m[1])*60+(m[2]?Number(m[2]):0);const n=Number(s);return isNaN(n)?settings.weeklyTarget:n*60;}
function setTarget(v){settings.weeklyTarget=parseTarget(v);saveSettings();syncPush();render();}
function setDays(v){settings.days=Math.max(1,Math.min(7,Number(v)||5));saveSettings();syncPush();render();}
function setLunch(v){settings.lunch=Math.max(0,Number(v)||0);saveSettings();syncPush();render();}
function setArr(v){settings.arrival=v||"08:15";saveSettings();syncPush();render();}
function setIcsTitle(v){settings.icsTitle=v||DEFAULTS.icsTitle;saveSettings();syncPush();}
function setIcsLocation(v){settings.icsLocation=v||"";saveSettings();syncPush();}
function setIcsCal(v){settings.icsCalendar=v||"";saveSettings();syncPush();}
async function handleSyncConnect(){
  const input=document.getElementById("sync-token");
  if(!input||!input.value.trim()){toast("Token requis");return;}
  const ok=await syncConnect(input.value.trim());
  if(ok){toast("Synchronisation activ\u00e9e");render();}
  else{toast("Token invalide");}
}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}

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
  r.onload=()=>{try{const o=JSON.parse(r.result);Object.keys(o).forEach(k=>{if(k.startsWith("pointeuse:"))localStorage.setItem(k,o[k]);});loadSettings();loadWeek();render();syncPush();toast("Donn\u00e9es restaur\u00e9es");}catch(e){toast("Fichier invalide");}};
  r.readAsText(file);
}

/* ---------- service worker ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

/* ---------- init ---------- */
(async function(){loadSettings();loadWeek();await syncPull();render();})();
