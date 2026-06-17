/* ---------- constants ---------- */
export const STORE_SETTINGS="pointeuse:settings";
export const DEFAULTS={weeklyTarget:2340,days:5,lunch:45,arrival:"08:15",icsTitle:"Travail",icsLocation:"",icsCalendar:""};
export const DAYNAMES=["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
export const MONTHNAMES=["janvier","f\u00e9vrier","mars","avril","mai","juin","juillet","ao\u00fbt","septembre","octobre","novembre","d\u00e9cembre"];

/* ---------- html escape ---------- */
export function esc(s){if(s==null)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}

/* ---------- time helpers ---------- */
export const pad=n=>String(n).padStart(2,"0");
export function toMin(hhmm){if(!hhmm)return null;const[h,m]=hhmm.split(":").map(Number);return h*60+m;}
export function toHHMM(min){min=((min%1440)+1440)%1440;return pad(Math.floor(min/60))+":"+pad(min%60);}
export function fmtDur(min){if(min==null)return"\u2014";const s=min<0?"-":"";min=Math.abs(min);return s+Math.floor(min/60)+"h"+pad(Math.round(min%60));}
export function fmtDelta(min){if(min==null)return"\u2014";if(Math.round(min)===0)return"0h00";const s=min>0?"+":"\u2212";min=Math.abs(min);return s+Math.floor(min/60)+"h"+pad(Math.round(min%60));}

/* ---------- week / date helpers ---------- */
export function getMonday(off=0){const d=new Date();const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day+off*7);d.setHours(0,0,0,0);return d;}
export function isoWeek(d){const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()+3-((t.getDay()+6)%7));const w1=new Date(t.getFullYear(),0,4);return{week:1+Math.round(((t-w1)/864e5-3+((w1.getDay()+6)%7))/7),year:t.getFullYear()};}
export function isoWeekMonday(year,wk){const jan4=new Date(year,0,4);const day=(jan4.getDay()+6)%7;const w1=new Date(jan4);w1.setDate(jan4.getDate()-day);const m=new Date(w1);m.setDate(w1.getDate()+(wk-1)*7);m.setHours(0,0,0,0);return m;}
export function weekKey(off){const m=getMonday(off);const{week,year}=isoWeek(m);return`pointeuse:week:${year}-W${pad(week)}`;}
export function todayIndex(off){if(off!==0)return -1;return (new Date().getDay()+6)%7;}
export function dailyTarget(settings){return Math.round(settings.weeklyTarget/settings.days);}

/* ---------- computation ---------- */
export function computeWeekObj(w,settings){
  const dt=dailyTarget(settings);
  let realized=0,delta=0,settledCount=0,projected=0,anyCount=0;
  const n=Math.max(settings.days,7);
  for(let i=0;i<n;i++){
    const d=w[i];if(!d)continue;
    const a=toMin(d.arrival);if(a==null)continue;
    anyCount++;
    const lunch=(d.lunch===0||d.lunch)?Number(d.lunch):settings.lunch;
    const dep=toMin(d.actualDeparture);
    if(dep!=null){const wk=dep-a-lunch;realized+=wk;projected+=wk;settledCount++;delta+=wk-dt;}
    else projected+=dt;
  }
  return{realized,settledDelta:delta,settledCount,projected,anyCount};
}

/* ---------- french public holidays ---------- */
export function easterMonday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100;
  const d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31)-1;
  const day=((h+l-7*m+114)%31)+1;
  return new Date(year,month,day+1);
}
export function frenchHolidays(year){
  const em=easterMonday(year);
  const asc=new Date(em);asc.setDate(asc.getDate()+38);
  const pent=new Date(em);pent.setDate(pent.getDate()+49);
  return[
    new Date(year,0,1),em,new Date(year,4,1),new Date(year,4,8),
    asc,pent,new Date(year,6,14),new Date(year,7,15),
    new Date(year,10,1),new Date(year,10,11),new Date(year,11,25),
  ];
}

/* ---------- target parser ---------- */
export function parseTarget(s){const m=s.match(/(\d+)\s*h\s*(\d+)?/i);if(m)return Number(m[1])*60+(m[2]?Number(m[2]):0);const n=Number(s);return isNaN(n)?null:n*60;}

/* ---------- backup validation ---------- */
export function validateBackup(o){
  if(typeof o!=="object"||o===null||Array.isArray(o))return false;
  const validStatuses=["work","leave","holiday","sick"];
  const timeRe=/^\d{2}:\d{2}$/;
  for(const[k,v]of Object.entries(o)){
    if(!k.startsWith("pointeuse:"))continue;
    if(typeof v!=="string")return false;
    if(k==="pointeuse:settings"){
      let s;try{s=JSON.parse(v);}catch(e){return false;}
      if(typeof s!=="object"||s===null)return false;
      if(s.weeklyTarget!=null&&(typeof s.weeklyTarget!=="number"||s.weeklyTarget<0||s.weeklyTarget>6000))return false;
      if(s.days!=null&&(typeof s.days!=="number"||s.days<1||s.days>7))return false;
      if(s.lunch!=null&&(typeof s.lunch!=="number"||s.lunch<0||s.lunch>300))return false;
      if(s.arrival!=null&&(typeof s.arrival!=="string"||!timeRe.test(s.arrival)))return false;
    }else if(k.startsWith("pointeuse:week:")){
      if(!/^pointeuse:week:\d{4}-W\d{2}$/.test(k))return false;
      let w;try{w=JSON.parse(v);}catch(e){return false;}
      if(typeof w!=="object"||w===null)return false;
      for(const[di,entry]of Object.entries(w)){
        if(!/^\d$/.test(di)||+di>6)return false;
        if(typeof entry!=="object"||entry===null)return false;
        if(entry.status&&!validStatuses.includes(entry.status))return false;
        if(entry.arrival!=null&&(typeof entry.arrival!=="string"||!timeRe.test(entry.arrival)))return false;
        if(entry.actualDeparture!=null&&(typeof entry.actualDeparture!=="string"||!timeRe.test(entry.actualDeparture)))return false;
        if(entry.lunch!=null&&typeof entry.lunch!=="number")return false;
      }
    }
  }
  return true;
}
