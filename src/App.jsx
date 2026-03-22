import { useState, useEffect, useMemo, useRef } from "react";
import { eventsRef, savedRef, discoverRef, wishlistRef, birthdaysRef, goalsRef, chatRef, onValue, set } from "./firebase";
import L from "leaflet";

/* ═══════════════════ CONSTANTS ═══════════════════ */
const CATS=[{id:"datenight",label:"Date Night",emoji:"💕",color:"#ec2682"},{id:"friends",label:"Friends",emoji:"🍻",color:"#ff8c42"},{id:"family",label:"Family",emoji:"🏠",color:"#a855f7"},{id:"guests",label:"Guests",emoji:"✈️",color:"#06b6d4"},{id:"work",label:"Work",emoji:"💼",color:"#6366f1"},{id:"fitness",label:"Fitness",emoji:"🏋️",color:"#22c55e"},{id:"culture",label:"Culture",emoji:"🎭",color:"#ec4899"},{id:"dining",label:"Dining",emoji:"🍽️",color:"#f59e0b"},{id:"nightout",label:"Night Out",emoji:"🌃",color:"#8b5cf6"},{id:"chill",label:"Chill",emoji:"🛋️",color:"#64748b"},{id:"travel",label:"Travel",emoji:"🌍",color:"#0ea5e9"},{id:"other",label:"Other",emoji:"📌",color:"#94a3b8"}];
const FOOD_TYPES=["Italian","Japanese","British","French","Indian","Mexican","Greek","Thai","Chinese","Korean","Mediterranean","Seafood","Steak","Vegan","Brunch","Other"];
const PRICE_RANGES=["£","££","£££","££££"];
const MOODS=[{emoji:"🔥",label:"Amazing"},{emoji:"😊",label:"Good"},{emoji:"😐",label:"Meh"},{emoji:"😤",label:"Bad"}];
const RECURRENCE_OPTS=["None","Daily","Weekly","Fortnightly","Monthly"];
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

const DISCOVER_EVENTS=[
  {id:"d1",title:"Tiella — No.1 in London",venue:"Bethnal Green",area:"Bethnal Green",date:"Now open",cat:"dining",emoji:"🍝",desc:"Crowned London's best new restaurant. Knockout regional Italian.",tag:"#1 Restaurant",src:"Time Out"},
  {id:"d2",title:"Oblix East at The Shard",venue:"The Shard",area:"London Bridge",date:"Ongoing",cat:"dining",emoji:"🌃",desc:"Chef's sharing menu with Champagne and skyline views.",tag:"Fine Dining",src:"Time Out"},
  {id:"d3",title:"PIANOHOUSE — Afrohouse",venue:"Golden Bee",area:"Shoreditch",date:"Monthly",cat:"nightout",emoji:"🎶",desc:"Amapiano, Afrohouse, Soulful House until 3am.",tag:"Afrohouse",src:"Fever"},
  {id:"d4",title:"The Weeknd — Wembley",venue:"Wembley Stadium",area:"Wembley",date:"14-19 Aug",cat:"nightout",emoji:"🎵",desc:"After Hours Til Dawn with Playboi Carti. Multiple nights.",tag:"Major Concert",src:"Live Nation"},
  {id:"d5",title:"Ronnie Scott's",venue:"Soho",area:"Soho",date:"Nightly",cat:"culture",emoji:"🎷",desc:"Legendary jazz club since 1959. Late Late Shows are iconic.",tag:"Jazz",src:"Ronnie Scott's"},
  {id:"d6",title:"ARC — Dopamine Reset",venue:"Canary Wharf",area:"Canary Wharf",date:"Weekly",cat:"fitness",emoji:"🧊",desc:"Sauna 88°C + ice baths 1-5°C. Boosts dopamine 250%.",tag:"Wellness",src:"ARC"},
  {id:"d7",title:"Tech.eu Summit",venue:"London",area:"Central",date:"21-22 Apr",cat:"work",emoji:"🚀",desc:"Europe's premier tech summit. Founders, VCs, AI.",tag:"Tech",src:"Tech.eu"},
  {id:"d8",title:"Passione Vino",venue:"Clerkenwell",area:"Clerkenwell",date:"Now open",cat:"dining",emoji:"🍷",desc:"Wine bar in a former tattoo parlour. On your doorstep.",tag:"Near You",src:"Time Out"},
  {id:"d9",title:"Maza — Greek Taverna",venue:"Bruton Place",area:"Mayfair",date:"Now open",cat:"dining",emoji:"🫒",desc:"Open fire kitchen, world's largest Greek wine list, vinyl upstairs.",tag:"Date Night",src:"London The Inside"},
  {id:"d10",title:"David Hockney",venue:"Serpentine North",area:"Hyde Park",date:"Until 23 Aug",cat:"culture",emoji:"🎨",desc:"Free iPad artworks exhibition. Unmissable.",tag:"Free",src:"Time Out"},
];
const SUGGESTIONS=["Book ARC's Dopamine Reset — perfect midweek energy","Passione Vino just opened in Clerkenwell","The Weeknd at Wembley in August — got tickets?","Try Ronnie Scott's Late Late Show on a Friday","Tiella is now London's #1 restaurant"];
const MANIFESTATIONS=[{text:"This is our season. Every move builds the life we want.",icon:"🔥"},{text:"We're 26 in London, thriving — only the beginning.",icon:"✦"},{text:"Good energy only. We attract what we put out.",icon:"⚡"},{text:"Main characters don't wait — they make it happen.",icon:"💫"},{text:"The city is ours. New week, new wins, new memories.",icon:"🌟"},{text:"Abundance is our default. In love, work, everything.",icon:"💎"},{text:"Two people, one vision, unlimited potential.",icon:"💕"}];

/* ═══════════════════ HELPERS ═══════════════════ */
function getMonthDays(y,m){const f=new Date(y,m,1),l=new Date(y,m+1,0).getDate();let s=f.getDay()-1;if(s<0)s=6;const d=[];for(let i=0;i<s;i++)d.push(null);for(let i=1;i<=l;i++)d.push(i);return d;}
function dk(y,m,d){return`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function getWeekDates(r){const d=new Date(r),day=d.getDay(),diff=day===0?6:day-1,mon=new Date(d);mon.setDate(d.getDate()-diff);return Array.from({length:7},(_,i)=>{const dd=new Date(mon);dd.setDate(mon.getDate()+i);return dd;});}
function getCat(id){return CATS.find(c=>c.id===id)||CATS[11];}
function getTags(ev){return ev.tags||(ev.category?[ev.category]:["other"]);}
function getTagEmojis(ev){return getTags(ev).map(t=>getCat(t).emoji).join("");}
function stars(n){return"★".repeat(n)+"☆".repeat(5-n);}
function compressImage(file,maxW=400){return new Promise(res=>{const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");let w=img.width,h=img.height;if(w>maxW){h=h*(maxW/w);w=maxW;}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",0.5));};img.src=e.target.result;};r.readAsDataURL(file);});}
function autoLink(ev){const n=encodeURIComponent((ev.restaurantName||ev.title||"")+" London");const tags=ev.tags||[];if(tags.includes("dining"))return{book:`https://www.opentable.co.uk/s?term=${n}`,web:`https://www.google.com/search?q=${n}+restaurant`,label:"Book on OpenTable"};if(tags.includes("nightout"))return{web:`https://www.google.com/search?q=${n}+tickets`,label:"Find Tickets"};if(tags.includes("culture"))return{web:`https://www.google.com/search?q=${n}+tickets+book`,label:"Book Tickets"};return{web:`https://www.google.com/search?q=${n}`,label:"Search"};}
function daysUntilDate(m,d){const now=new Date(),this_y=new Date(now.getFullYear(),m-1,d),next_y=new Date(now.getFullYear()+1,m-1,d);const target=this_y>=new Date(now.getFullYear(),now.getMonth(),now.getDate())?this_y:next_y;return Math.ceil((target-now)/86400000);}
// Generate recurring event instances for display
function getRecurringInstances(events,startDate,endDate){const instances={};Object.entries(events).forEach(([key,evs])=>{evs.forEach(ev=>{if(!ev.recurrence||ev.recurrence==="None")return;const start=new Date(key+"T00:00:00");let interval=0;if(ev.recurrence==="Daily")interval=1;else if(ev.recurrence==="Weekly")interval=7;else if(ev.recurrence==="Fortnightly")interval=14;else if(ev.recurrence==="Monthly")interval=30;if(!interval)return;const d=new Date(start);for(let i=0;i<90;i++){d.setDate(d.getDate()+interval);if(d<startDate)continue;if(d>endDate)break;const k=dk(d.getFullYear(),d.getMonth(),d.getDate());if(!instances[k])instances[k]=[];instances[k].push({...ev,isRecurring:true,originalDate:key});}});});return instances;}
// Merge recurring into real events
function mergedEvents(events,startDate,endDate){const recurring=getRecurringInstances(events,startDate,endDate);const merged={...events};Object.entries(recurring).forEach(([k,evs])=>{if(!merged[k])merged[k]=[];merged[k]=[...merged[k],...evs];});return merged;}

/* ═══════════════════ THEMES ═══════════════════ */
const TH={pink:{bg:"linear-gradient(155deg,#fce4ec 0%,#f8c8d8 30%,#f5bed0 55%,#fce0e8 100%)",card:"rgba(255,248,245,0.7)",cardS:"#fce4ec",bd:"rgba(236,38,130,0.14)",acc:"#ec2682",acc2:"#f06daa",glow:"0 0 24px rgba(236,38,130,0.22)",soft:"rgba(236,38,130,0.06)",med:"rgba(236,38,130,0.13)",tx:"#4a1535",sub:"#b07090",tBg:"#ec2682",tTx:"#fff",inBg:"rgba(255,248,245,0.88)",ov:"rgba(252,228,236,0.82)",chip:"rgba(236,38,130,0.06)",chipBd:"rgba(236,38,130,0.15)",chipA:"#ec2682",bar:"rgba(236,38,130,0.1)",dGrad:"linear-gradient(135deg,#fce4ec,#f5bed0)",tagBg:"rgba(236,38,130,0.08)",tagTx:"#ec2682",hf:"'Cormorant Garamond',serif"},blue:{bg:"linear-gradient(155deg,#e8f0f8 0%,#d4e3f0 30%,#c6daea 55%,#e4edf6 100%)",card:"rgba(255,255,255,0.6)",cardS:"#e6eff7",bd:"rgba(78,120,168,0.16)",acc:"#4e78a8",acc2:"#7da0c4",glow:"0 0 24px rgba(78,120,168,0.2)",soft:"rgba(78,120,168,0.06)",med:"rgba(78,120,168,0.13)",tx:"#1a2d42",sub:"#7a96b0",tBg:"#4e78a8",tTx:"#fff",inBg:"rgba(255,255,255,0.85)",ov:"rgba(212,227,240,0.82)",chip:"rgba(78,120,168,0.06)",chipBd:"rgba(78,120,168,0.15)",chipA:"#4e78a8",bar:"rgba(78,120,168,0.1)",dGrad:"linear-gradient(135deg,#e8f0f8,#c6daea)",tagBg:"rgba(78,120,168,0.1)",tagTx:"#4e78a8",hf:"'Cormorant Garamond',serif"}};

/* ═══════════════════ MAP ═══════════════════ */
function MiniMap({events,t}){const mapRef=useRef(null);const mapInst=useRef(null);const pins=useMemo(()=>{const p=[];Object.entries(events).forEach(([dk,evs])=>evs.forEach(ev=>{if(ev.lat&&ev.lng)p.push({...ev,date:dk});}));return p;},[events]);useEffect(()=>{if(!mapRef.current)return;if(mapInst.current)mapInst.current.remove();const m=L.map(mapRef.current).setView([51.5203,-0.1052],13);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'©OSM'}).addTo(m);pins.forEach(p=>{const col=getCat((p.tags||[])[0]||"other").color;L.circleMarker([p.lat,p.lng],{radius:8,fillColor:col,color:"#fff",weight:2,fillOpacity:0.9}).addTo(m).bindPopup(`<b>${p.title}</b><br>${p.address||""}<br>${p.date}`);});if(pins.length>0)m.fitBounds(L.latLngBounds(pins.map(p=>[p.lat,p.lng])),{padding:[30,30]});mapInst.current=m;return()=>{if(mapInst.current){mapInst.current.remove();mapInst.current=null;}};},[pins]);if(!pins.length)return<div style={{padding:"30px 20px",textAlign:"center",background:t.card,borderRadius:16,border:`1px solid ${t.bd}`}}><p style={{color:t.sub,fontSize:13}}>Add locations to events to see them on the map</p></div>;return<div ref={mapRef} style={{height:300,borderRadius:16,overflow:"hidden",border:`1px solid ${t.bd}`}} />;}

/* ═══════════════════ MAIN APP ═══════════════════ */
export default function App(){
  const[theme,setTheme]=useState("pink");
  const[events,setEvents]=useState({});
  const[tab,setTab]=useState("home");
  const[modal,setModal]=useState(null);
  const[cMonth,setCMonth]=useState(new Date().getMonth());
  const[cYear,setCYear]=useState(new Date().getFullYear());
  const emptyForm={title:"",tags:[],people:"",notes:"",time:"",duration:"",images:[],rating:0,foodType:"",priceRange:"",restaurantName:"",bestDish:"",link:"",address:"",lat:null,lng:null,recurrence:"None",mood:"",travelDays:[]};
  const[form,setForm]=useState({...emptyForm});
  const[editIdx,setEditIdx]=useState(null);
  const[selDate,setSelDate]=useState(null);
  const[viewEv,setViewEv]=useState(null);
  const[discFilter,setDiscFilter]=useState("all");
  const[loaded,setLoaded]=useState(false);
  const[saved,setSaved]=useState([]);
  const[searchQ,setSearchQ]=useState("");
  const[searchFocused,setSearchFocused]=useState(false);
  const[liveDiscover,setLiveDiscover]=useState(null);
  const[discoverUpdated,setDiscoverUpdated]=useState(null);
  const[refreshing,setRefreshing]=useState(false);
  const[insightTab,setInsightTab]=useState("stats");
  const[wishlist,setWishlist]=useState([]);
  const[showAddWish,setShowAddWish]=useState(false);
  const[wishForm,setWishForm]=useState({name:"",type:"",area:"",link:"",notes:""});
  const[birthdays,setBirthdays]=useState([]);
  const[showAddBday,setShowAddBday]=useState(false);
  const[bdayForm,setBdayForm]=useState({name:"",month:1,day:1,type:"Birthday"});
  const[goals,setGoals]=useState([]);
  const[showAddGoal,setShowAddGoal]=useState(false);
  const[goalForm,setGoalForm]=useState({text:"",target:5,current:0,emoji:"🎯"});
  const[chatMsgs,setChatMsgs]=useState([]);
  const[chatInput,setChatInput]=useState("");
  const[chatLoading,setChatLoading]=useState(false);
  const[moreTab,setMoreTab]=useState("concierge");
  const[weather,setWeather]=useState(null);
  const[wrapText,setWrapText]=useState("");
  const[wrapLoading,setWrapLoading]=useState(false);

  const t=TH[theme];const now=new Date();const todayStr=dk(now.getFullYear(),now.getMonth(),now.getDate());

  // ── Firebase sync ──
  useEffect(()=>{
    const u1=onValue(eventsRef,s=>{setEvents(s.val()||{});setLoaded(true);},()=>{try{const r=localStorage.getItem("cv5-events");if(r)setEvents(JSON.parse(r));}catch{}setLoaded(true);});
    const u2=onValue(savedRef,s=>{if(s.val())setSaved(s.val());});
    const u3=onValue(discoverRef,s=>{const d=s.val();if(d?.events){setLiveDiscover(d.events);setDiscoverUpdated(d.updatedAt||null);}});
    const u4=onValue(wishlistRef,s=>{if(s.val())setWishlist(s.val());});
    const u5=onValue(birthdaysRef,s=>{if(s.val())setBirthdays(s.val());});
    const u6=onValue(goalsRef,s=>{if(s.val())setGoals(s.val());});
    const u7=onValue(chatRef,s=>{if(s.val())setChatMsgs(s.val());});
    try{const r=localStorage.getItem("cv5-theme");if(r)setTheme(r);}catch{}
    return()=>{u1();u2();u3();u4();u5();u6();u7();};},[]);

  const sync=(ref,data,lsKey)=>{try{set(ref,data);}catch{}if(lsKey)try{localStorage.setItem(lsKey,JSON.stringify(data));}catch{}};
  const syncEv=ev=>{setEvents(ev);sync(eventsRef,ev,"cv5-events");};
  const syncSaved=sv=>{setSaved(sv);sync(savedRef,sv);};
  const syncWishlist=wl=>{setWishlist(wl);sync(wishlistRef,wl);};
  const syncBdays=bd=>{setBirthdays(bd);sync(birthdaysRef,bd);};
  const syncGoals=gl=>{setGoals(gl);sync(goalsRef,gl);};
  const syncChat=msgs=>{setChatMsgs(msgs);sync(chatRef,msgs);};
  useEffect(()=>{if(loaded)try{localStorage.setItem("cv5-theme",theme);}catch{}},[theme,loaded]);

  // ── Weather (Open-Meteo, free, no key) ──
  useEffect(()=>{fetch("https://api.open-meteo.com/v1/forecast?latitude=51.52&longitude=-0.11&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/London&forecast_days=7").then(r=>r.json()).then(d=>{if(d.daily)setWeather(d.daily);}).catch(()=>{});},[]);
  const weatherIcon=code=>{if(code<=1)return"☀️";if(code<=3)return"⛅";if(code<=49)return"🌥️";if(code<=69)return"🌧️";if(code<=79)return"❄️";if(code<=99)return"⛈️";return"🌤️";};

  // ── Push notifications ──
  useEffect(()=>{if(!loaded)return;if(!("Notification"in window))return;
    const ask=async()=>{if(Notification.permission==="default")await Notification.requestPermission();
      if(Notification.permission==="granted"){const todayEvs=events[todayStr]||[];
        if(todayEvs.length>0){new Notification("Our Calendar 📅",{body:`You have ${todayEvs.length} event${todayEvs.length>1?"s":""} today: ${todayEvs.map(e=>e.title).join(", ")}`,icon:"/apple-touch-icon.png"});}}};
    const timeout=setTimeout(ask,2000);return()=>clearTimeout(timeout);},[loaded,todayStr]);

  // ── Derived data ──
  const weekDates=useMemo(()=>getWeekDates(now),[todayStr]);
  const monthDays=useMemo(()=>getMonthDays(cYear,cMonth),[cYear,cMonth]);
  const viewStart=new Date(now);viewStart.setDate(viewStart.getDate()-1);
  const viewEnd=new Date(now);viewEnd.setDate(viewEnd.getDate()+90);
  const allMerged=useMemo(()=>mergedEvents(events,viewStart,viewEnd),[events,todayStr]);

  // ── Event CRUD ──
  const openAdd=ds=>{setSelDate(ds);setForm({...emptyForm});setEditIdx(null);setModal("add");};
  const openView=(ds,idx)=>{const ev=(allMerged[ds]||events[ds]||[])[idx];if(!ev)return;setSelDate(ds);setEditIdx(idx);setViewEv({...ev,date:ds,idx});setModal("view");};
  const openEdit=()=>{const ev=viewEv;setForm({title:ev.title,tags:getTags(ev),people:ev.people||"",notes:ev.notes||"",time:ev.time||"",duration:ev.duration||"",images:ev.images||[],rating:ev.rating||0,foodType:ev.foodType||"",priceRange:ev.priceRange||"",restaurantName:ev.restaurantName||"",bestDish:ev.bestDish||"",link:ev.link||"",address:ev.address||"",lat:ev.lat||null,lng:ev.lng||null,recurrence:ev.recurrence||"None",mood:ev.mood||"",travelDays:ev.travelDays||[]});setModal("edit");};
  const saveEv=()=>{if(!form.title.trim())return;const c={...events};const key=selDate;if(!c[key])c[key]=[];else c[key]=[...c[key]];if(editIdx!==null&&!viewEv?.isRecurring)c[key][editIdx]={...form};else c[key].push({...form});syncEv(c);setModal(null);};
  const delEv=()=>{if(viewEv?.isRecurring)return;const c={...events};c[selDate]=c[selDate].filter((_,i)=>i!==editIdx);if(!c[selDate].length)delete c[selDate];syncEv(c);setModal(null);};
  const toggleTag=id=>setForm(f=>({...f,tags:f.tags.includes(id)?f.tags.filter(t=>t!==id):[...f.tags,id]}));
  const toggleSaved=id=>syncSaved(saved.includes(id)?saved.filter(x=>x!==id):[...saved,id]);
  const navMonth=dir=>{if(dir===1){cMonth===11?(setCMonth(0),setCYear(y=>y+1)):setCMonth(m=>m+1);}else{cMonth===0?(setCMonth(11),setCYear(y=>y-1)):setCMonth(m=>m-1);}};
  const addImage=async e=>{const files=Array.from(e.target.files);const compressed=await Promise.all(files.slice(0,6-form.images.length).map(f=>compressImage(f)));setForm(f=>({...f,images:[...f.images,...compressed]}));};
  const removeImage=idx=>setForm(f=>({...f,images:f.images.filter((_,i)=>i!==idx)}));
  const addLocation=()=>{navigator.geolocation?.getCurrentPosition(pos=>setForm(f=>({...f,lat:pos.coords.latitude,lng:pos.coords.longitude,address:f.address||"📍 Current location"})));};
  const searchAddress=async()=>{if(!form.address.trim())return;try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.address+", London")}&format=json&limit=1`);const d=await r.json();if(d[0])setForm(f=>({...f,lat:parseFloat(d[0].lat),lng:parseFloat(d[0].lon)}));}catch{}};

  // ── Wishlist, Bdays, Goals CRUD ──
  const addWish=()=>{if(!wishForm.name.trim())return;syncWishlist([...wishlist,{...wishForm,id:"w"+Date.now()}]);setWishForm({name:"",type:"",area:"",link:"",notes:""});setShowAddWish(false);};
  const removeWish=id=>syncWishlist(wishlist.filter(w=>w.id!==id));
  const addBday=()=>{syncBdays([...birthdays,{...bdayForm,id:"b"+Date.now()}]);setBdayForm({name:"",month:1,day:1,type:"Birthday"});setShowAddBday(false);};
  const removeBday=id=>syncBdays(birthdays.filter(b=>b.id!==id));
  const addGoal=()=>{if(!goalForm.text.trim())return;syncGoals([...goals,{...goalForm,id:"g"+Date.now()}]);setGoalForm({text:"",target:5,current:0,emoji:"🎯"});setShowAddGoal(false);};
  const updateGoalProgress=(id,delta)=>{syncGoals(goals.map(g=>g.id===id?{...g,current:Math.max(0,Math.min(g.target,(g.current||0)+delta))}:g));};
  const removeGoal=id=>syncGoals(goals.filter(g=>g.id!==id));

  // ── AI Concierge ──
  const sendChat=async(msg,mode="chat")=>{if(!msg?.trim())return;const newMsgs=[...chatMsgs,{role:"user",text:msg,time:Date.now()}];setChatMsgs(newMsgs);setChatInput("");setChatLoading(true);
    try{const context=JSON.stringify({totalEvents:analytics.total,topCats:analytics.topCats.slice(0,5),ranked:analytics.ranked.slice(0,5).map(e=>e.displayName)});
      const r=await fetch("/api/concierge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,mode,context})});
      const d=await r.json();const reply=[...newMsgs,{role:"assistant",text:d.reply||d.error||"Sorry, something went wrong.",time:Date.now()}];setChatMsgs(reply);syncChat(reply);
    }catch(err){const reply=[...newMsgs,{role:"assistant",text:"Couldn't connect — check your API key in Vercel.",time:Date.now()}];setChatMsgs(reply);}setChatLoading(false);};
  const planDate=()=>sendChat("Plan us a perfect date night this weekend. Be specific with real venues, times, and booking links.","plandate");
  const planGuest=(details)=>sendChat(`Plan a ${details||"3-day"} London itinerary for our guests visiting. Mix culture, food, walks, and nightlife. Be specific.`,"guestplan");
  const genWrap=()=>{setWrapLoading(true);const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;const monthEvs=Object.entries(events).filter(([k])=>k.startsWith(monthKey)).flatMap(([k,evs])=>evs.map(e=>({...e,date:k})));
    fetch("/api/concierge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Create our monthly wrap for ${MONTHS[now.getMonth()]} ${now.getFullYear()}.`,mode:"wrap",context:JSON.stringify({events:monthEvs.map(e=>({title:e.title,tags:getTags(e),date:e.date,mood:e.mood,rating:e.rating})),totalThisMonth:monthEvs.length})})}).then(r=>r.json()).then(d=>setWrapText(d.reply||"Couldn't generate wrap.")).catch(()=>setWrapText("Error generating wrap.")).finally(()=>setWrapLoading(false));};

  // ── Analytics ──
  const analytics=useMemo(()=>{
    const all=Object.entries(events).flatMap(([d,evs])=>evs.map(e=>({...e,date:d,tags:getTags(e)})));
    const catCount={},personCount={};
    all.forEach(e=>{e.tags.forEach(tag=>{catCount[tag]=(catCount[tag]||0)+1;});if(e.people)e.people.split(",").map(p=>p.trim()).filter(Boolean).forEach(p=>{personCount[p]=(personCount[p]||0)+1;});});
    const topCats=Object.entries(catCount).sort((a,b)=>b[1]-a[1]);
    const topPeople=Object.entries(personCount).sort((a,b)=>b[1]-a[1]);
    const weekKeys=weekDates.map(d=>dk(d.getFullYear(),d.getMonth(),d.getDate()));
    const weekEvs=weekKeys.flatMap(k=>(allMerged[k]||[]).map(e=>({...e,date:k,tags:getTags(e)})));
    const outCats=["datenight","friends","dining","nightout","culture","guests","travel"];
    const weekOut=weekEvs.filter(e=>e.tags.some(t=>outCats.includes(t))).length;
    const upcoming=[];for(let i=0;i<14;i++){const d=new Date(now);d.setDate(now.getDate()+i);const key=dk(d.getFullYear(),d.getMonth(),d.getDate());(allMerged[key]||[]).forEach((e,idx)=>upcoming.push({...e,date:key,idx}));}
    const ranked=all.filter(e=>e.rating>0).map(e=>({...e,displayName:e.restaurantName||e.title})).sort((a,b)=>b.rating-a.rating);
    const allImages=all.filter(e=>e.images?.length>0).flatMap(e=>e.images.map(img=>({img,title:e.title,date:e.date})));
    const moodCounts={};all.filter(e=>e.mood).forEach(e=>{moodCounts[e.mood]=(moodCounts[e.mood]||0)+1;});
    const countdowns=upcoming.filter(e=>e.date>todayStr).slice(0,3).map(e=>({...e,daysUntil:Math.ceil((new Date(e.date+"T00:00:00")-now)/86400000)}));
    return{topCats,topPeople,maxCat:topCats[0]?.[1]||1,maxPerson:topPeople[0]?.[1]||1,total:all.length,weekEvs,weekOut,upcoming,ranked,allImages,moodCounts,countdowns,suggs:SUGGESTIONS};
  },[events,todayStr,allMerged]);

  const ACTIVE_DISCOVER=useMemo(()=>liveDiscover?.length>0?liveDiscover:DISCOVER_EVENTS,[liveDiscover]);
  const filteredDisc=useMemo(()=>{if(discFilter==="all")return ACTIVE_DISCOVER;if(discFilter==="saved")return ACTIVE_DISCOVER.filter(e=>saved.includes(e.id));if(discFilter==="nearyou")return ACTIVE_DISCOVER.filter(e=>["Clerkenwell","City","Borough","Strand","Soho","Central","Shoreditch"].some(a=>(e.area||"").includes(a)));return ACTIVE_DISCOVER.filter(e=>e.cat===discFilter);},[discFilter,saved,ACTIVE_DISCOVER]);
  const refreshDiscover=async()=>{setRefreshing(true);try{await fetch("/api/update-events");}catch{}setRefreshing(false);};

  // Bday countdowns
  const bdayCountdowns=useMemo(()=>birthdays.map(b=>({...b,daysUntil:daysUntilDate(b.month,b.day)})).sort((a,b)=>a.daysUntil-b.daysUntil),[birthdays]);

  // ── Components ──
  const Tg=({children,style})=><span style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:6,background:t.tagBg,color:t.tagTx,letterSpacing:"0.03em",whiteSpace:"nowrap",...style}}>{children}</span>;
  const Lbl=({children})=><label style={{fontSize:10,fontWeight:600,color:t.sub,marginBottom:5,display:"block",letterSpacing:"0.05em",textTransform:"uppercase"}}>{children}</label>;
  const Card=({children,style,...p})=><div style={{background:t.card,border:`1px solid ${t.bd}`,borderRadius:16,backdropFilter:"blur(20px)",padding:"14px",...style}} {...p}>{children}</div>;

  if(!loaded)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:t.bg,color:t.tx,fontFamily:"'Sora'"}}><p style={{opacity:0.4}}>Loading...</p></div>;

  return(
    <div style={{minHeight:"100vh",background:t.bg,color:t.tx,fontFamily:"'Sora',sans-serif",transition:"all 0.45s ease",overflowX:"hidden",paddingBottom:78}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.94) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:${t.glow}}50%{box-shadow:0 0 36px ${t.acc}44}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .fu{animation:fadeUp 0.4s ease both}.s1{animation-delay:0.05s}.s2{animation-delay:0.1s}.s3{animation-delay:0.15s}
        input,textarea,select{font-family:'Sora',sans-serif;font-size:15px;border:1.5px solid ${t.bd};background:${t.inBg};color:${t.tx};border-radius:12px;padding:11px 13px;outline:none;width:100%;transition:all 0.2s;backdrop-filter:blur(10px)}
        input:focus,textarea:focus,select:focus{border-color:${t.acc};box-shadow:0 0 0 3px ${t.soft}}
        textarea{resize:vertical;min-height:50px}select{cursor:pointer;appearance:none}
        ::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:${t.med};border-radius:3px}
        .hs::-webkit-scrollbar{display:none}.leaflet-container{font-family:'Sora',sans-serif}
      `}</style>

      {/* ═══ HEADER ═══ */}
      <div style={{padding:"16px 20px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h1 style={{fontFamily:t.hf,fontSize:28,fontWeight:500,fontStyle:"italic"}}>Our Calendar</h1>
            <p style={{fontSize:11,color:t.sub,marginTop:2,fontWeight:500}}>Farringdon, London · {analytics.total} events</p>
          </div>
          <button onClick={()=>setTheme(theme==="pink"?"blue":"pink")} style={{width:50,height:26,borderRadius:13,border:"none",cursor:"pointer",position:"relative",background:theme==="pink"?"linear-gradient(135deg,#ec2682,#f06daa)":"linear-gradient(135deg,#4e78a8,#7da0c4)",boxShadow:t.glow}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:theme==="pink"?3:27,transition:"left 0.3s cubic-bezier(0.4,0,0.2,1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{theme==="pink"?"💗":"💙"}</div>
          </button>
        </div>
        {/* Weather bar */}
        {weather&&<div className="hs" style={{display:"flex",gap:8,marginTop:10,overflowX:"auto",paddingBottom:2}}>
          {weather.time.slice(0,7).map((d,i)=>{const dayName=i===0?"Today":new Date(d).toLocaleDateString("en-GB",{weekday:"short"});return<div key={i} style={{textAlign:"center",minWidth:48,padding:"6px 4px",borderRadius:10,background:i===0?t.soft:"transparent"}}>
            <div style={{fontSize:9,fontWeight:600,color:t.sub}}>{dayName}</div>
            <div style={{fontSize:18,margin:"2px 0"}}>{weatherIcon(weather.weathercode[i])}</div>
            <div style={{fontSize:10,fontWeight:600}}>{Math.round(weather.temperature_2m_max[i])}°</div>
            <div style={{fontSize:9,color:t.sub}}>{Math.round(weather.temperature_2m_min[i])}°</div>
          </div>;})}
        </div>}
      </div>

      {/* ═══ SEARCH ═══ */}
      <div style={{padding:"8px 20px 0",position:"relative",zIndex:800}}>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,background:t.card,border:`1.5px solid ${searchFocused?t.acc:t.bd}`,borderRadius:14,padding:"0 14px",backdropFilter:"blur(20px)"}}>
            <span style={{fontSize:14,opacity:0.5}}>🔍</span>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onFocus={()=>setSearchFocused(true)} placeholder="Search events, people..." style={{border:"none",background:"transparent",padding:"11px 0",fontSize:13}} />
            {(searchQ||searchFocused)&&<button onClick={()=>{setSearchQ("");setSearchFocused(false);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:t.sub}}>✕</button>}
          </div>
          {searchFocused&&<div onClick={()=>{setSearchFocused(false);setSearchQ("");}} style={{position:"fixed",inset:0,zIndex:799}} />}
          {searchFocused&&<div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:t.cardS,border:`1px solid ${t.bd}`,borderRadius:16,maxHeight:300,overflowY:"auto",zIndex:810,animation:"fadeUp 0.2s",padding:10}}>
            {!searchQ.trim()?<div style={{display:"flex",flexWrap:"wrap",gap:4}}>{CATS.map(c=><button key={c.id} onClick={()=>setSearchQ(c.label)} style={{padding:"5px 9px",borderRadius:8,border:`1px solid ${t.chipBd}`,background:t.chip,color:t.tx,fontSize:11,fontFamily:"'Sora'",cursor:"pointer"}}>{c.emoji} {c.label}</button>)}</div>
            :(()=>{const results=[];Object.entries(events).forEach(([key,evs])=>evs.forEach((ev,idx)=>{if(`${ev.title} ${(ev.tags||[]).join(" ")} ${ev.people||""} ${ev.notes||""}`.toLowerCase().includes(searchQ.toLowerCase()))results.push({...ev,date:key,idx});}));
              return!results.length?<p style={{color:t.sub,fontSize:12,textAlign:"center",padding:12}}>No results</p>
              :results.slice(0,8).map((ev,i)=><button key={i} onClick={()=>{setSearchQ("");setSearchFocused(false);openView(ev.date,ev.idx);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"8px 6px",borderRadius:10,border:"none",background:"transparent",color:t.tx,fontFamily:"'Sora'",cursor:"pointer"}}><span style={{fontSize:18}}>{getTagEmojis(ev)}</span><div><div style={{fontWeight:600,fontSize:12}}>{ev.title}</div><div style={{fontSize:10,color:t.sub}}>{ev.date}{ev.time?` · ${ev.time}`:""}</div></div></button>);})()}
          </div>}
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:900,background:t.cardS,borderTop:`1px solid ${t.bd}`,display:"flex",justifyContent:"space-around",padding:"4px 0 env(safe-area-inset-bottom,6px)",backdropFilter:"blur(24px)"}}>
        {[["home","Home","🏠"],["calendar","Calendar","📅"],["discover","Discover","🔥"],["insights","Insights","✨"],["more","More","🧠"]].map(([k,l,ic])=>
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"4px 0",color:tab===k?t.acc:t.sub,fontFamily:"'Sora'"}}>
            <span style={{fontSize:18}}>{ic}</span><span style={{fontSize:9,fontWeight:tab===k?700:500}}>{l}</span>
            {tab===k&&<div style={{width:4,height:4,borderRadius:2,background:t.acc}} />}
          </button>)}
      </div>

      {/* ═══════════ HOME ═══════════ */}
      {tab==="home"&&<div style={{padding:"12px 20px"}}>
        {/* Birthdays/Anniversaries coming up */}
        {bdayCountdowns.filter(b=>b.daysUntil<=14).length>0&&<Card className="fu" style={{marginBottom:12,padding:"12px 14px"}}>
          <h3 style={{fontSize:12,fontWeight:600,marginBottom:8}}>🎂 Coming Up</h3>
          {bdayCountdowns.filter(b=>b.daysUntil<=14).map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:12,fontWeight:700,lineHeight:1}}>{b.daysUntil}</span><span style={{fontSize:7}}>days</span></div>
            <div><span style={{fontWeight:600,fontSize:12}}>{b.name}</span><span style={{fontSize:11,color:t.sub}}> · {b.type}</span></div>
          </div>)}
        </Card>}

        {/* Week strip */}
        <Card className="fu" style={{marginBottom:12,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <h2 style={{fontFamily:t.hf,fontSize:18,fontWeight:500}}>This Week</h2>
            <Tg>{analytics.weekOut} outing{analytics.weekOut!==1?"s":""}</Tg>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {weekDates.map((date,i)=>{const key=dk(date.getFullYear(),date.getMonth(),date.getDate()),isT=key===todayStr,evs=allMerged[key]||[];
              return<button key={i} onClick={()=>openAdd(key)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 0",borderRadius:12,border:"none",cursor:"pointer",background:isT?t.tBg:evs.length?t.soft:"transparent",color:isT?t.tTx:t.tx,fontFamily:"'Sora'",boxShadow:isT?t.glow:"none"}}>
                <span style={{fontSize:8,fontWeight:600,opacity:0.6,textTransform:"uppercase"}}>{DAYS[i]}</span>
                <span style={{fontSize:14,fontWeight:isT?700:500}}>{date.getDate()}</span>
                <div style={{display:"flex",gap:2,minHeight:4}}>{evs.slice(0,3).map((e,j)=><div key={j} style={{width:4,height:4,borderRadius:"50%",background:isT?t.tTx:getCat(getTags(e)[0]).color}} />)}</div>
              </button>;})}
          </div>
        </Card>

        {/* Week events */}
        {analytics.weekEvs.length>0&&<div className="fu s1" style={{marginBottom:12}}>
          {weekDates.map((date,i)=>{const key=dk(date.getFullYear(),date.getMonth(),date.getDate()),evs=allMerged[key]||[],isT=key===todayStr;
            return evs.map((ev,j)=><button key={`${i}-${j}`} onClick={()=>openView(key,j)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"10px 11px",borderRadius:13,marginBottom:3,cursor:"pointer",background:t.card,border:`1px solid ${isT?t.acc+"44":t.bd}`,color:t.tx,fontFamily:"'Sora'"}}>
              <span style={{fontSize:18}}>{getTagEmojis(ev)}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}{ev.isRecurring?" 🔁":""}</div>
              <div style={{fontSize:10,color:t.sub}}>{isT?"Today":DAYS[i]}{ev.time?` · ${ev.time}`:""}{ev.duration?` · ${ev.duration}`:""}{ev.people?` · ${ev.people}`:""}</div></div>
              {ev.mood&&<span style={{fontSize:16}}>{ev.mood}</span>}
              {ev.rating>0&&<span style={{fontSize:10,color:t.acc}}>{stars(ev.rating)}</span>}
            </button>);})}
        </div>}

        {/* Manifestation */}
        <div className="fu s2" style={{padding:"16px",borderRadius:16,marginBottom:10,textAlign:"center",background:`linear-gradient(135deg,${t.acc}11,${t.acc2}18)`,border:`1px solid ${t.acc}22`}}>
          <div style={{fontSize:20,marginBottom:4}}>{MANIFESTATIONS[Math.floor(Date.now()/86400000)%MANIFESTATIONS.length].icon}</div>
          <p style={{fontFamily:t.hf,fontSize:16,fontWeight:500,fontStyle:"italic",lineHeight:1.5,opacity:0.9}}>"{MANIFESTATIONS[Math.floor(Date.now()/86400000)%MANIFESTATIONS.length].text}"</p>
        </div>

        {/* Quick actions */}
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button onClick={planDate} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${t.chipBd}`,background:t.chip,cursor:"pointer",fontFamily:"'Sora'",textAlign:"center"}}>
            <div style={{fontSize:20}}>💕</div><div style={{fontSize:11,fontWeight:600,color:t.acc,marginTop:2}}>Plan a Date</div>
          </button>
          <button onClick={()=>{setTab("more");setMoreTab("concierge");}} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${t.chipBd}`,background:t.chip,cursor:"pointer",fontFamily:"'Sora'",textAlign:"center"}}>
            <div style={{fontSize:20}}>🧠</div><div style={{fontSize:11,fontWeight:600,color:t.acc,marginTop:2}}>AI Concierge</div>
          </button>
          <button onClick={()=>{setTab("more");setMoreTab("goals");}} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${t.chipBd}`,background:t.chip,cursor:"pointer",fontFamily:"'Sora'",textAlign:"center"}}>
            <div style={{fontSize:20}}>🎯</div><div style={{fontSize:11,fontWeight:600,color:t.acc,marginTop:2}}>Our Goals</div>
          </button>
        </div>

        {/* Hot in London */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <h3 style={{fontSize:11,fontWeight:600,color:t.sub,textTransform:"uppercase"}}>Hot in London</h3>
          <button onClick={()=>setTab("discover")} style={{background:"none",border:"none",color:t.acc,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'"}}>See all →</button>
        </div>
        <div className="hs" style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {ACTIVE_DISCOVER.slice(0,6).map(ev=><div key={ev.id} onClick={()=>setTab("discover")} style={{minWidth:180,padding:"12px",borderRadius:14,cursor:"pointer",background:t.card,border:`1px solid ${t.bd}`,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><span style={{fontSize:18}}>{ev.emoji}</span><Tg>{ev.tag}</Tg></div>
            <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{ev.title}</div>
            <div style={{fontSize:10,color:t.sub}}>{ev.venue}</div>
          </div>)}
        </div>
      </div>}

      {/* ═══════════ CALENDAR ═══════════ */}
      {tab==="calendar"&&<div style={{padding:"12px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <button onClick={()=>navMonth(-1)} style={{width:34,height:34,borderRadius:10,border:`1.5px solid ${t.bd}`,background:t.soft,color:t.tx,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{textAlign:"center"}}><div style={{fontFamily:t.hf,fontSize:20,fontWeight:500}}>{MONTHS[cMonth]}</div><div style={{fontSize:10,color:t.sub}}>{cYear}</div></div>
          <button onClick={()=>navMonth(1)} style={{width:34,height:34,borderRadius:10,border:`1.5px solid ${t.bd}`,background:t.soft,color:t.tx,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
          {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:600,color:t.sub,textTransform:"uppercase"}}>{d}</div>)}
        </div>
        <div className="fu" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {monthDays.map((day,i)=>{if(!day)return<div key={`e${i}`} />;const key=dk(cYear,cMonth,day),isT=key===todayStr,evs=allMerged[key]||[];
            return<button key={i} onClick={()=>openAdd(key)} style={{aspectRatio:"1",borderRadius:11,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,border:isT?`2px solid ${t.acc}`:evs.length?`1px solid ${t.bd}`:"1px solid transparent",background:isT?t.tBg:evs.length?t.soft:"transparent",color:isT?t.tTx:t.tx,fontFamily:"'Sora'",boxShadow:isT?t.glow:"none"}}>
              <span style={{fontSize:12,fontWeight:isT?700:evs.length?600:400}}>{day}</span>
              {evs.length>0&&<div style={{display:"flex",gap:2}}>{evs.slice(0,3).map((e,j)=><div key={j} style={{width:3,height:3,borderRadius:"50%",background:isT?t.tTx:getCat(getTags(e)[0]).color}} />)}</div>}
            </button>;})}
        </div>
        <div style={{marginTop:14}}>
          {(()=>{const mEvs=Object.entries(allMerged).filter(([k])=>k.startsWith(`${cYear}-${String(cMonth+1).padStart(2,"0")}`)).sort((a,b)=>a[0].localeCompare(b[0]));
            if(!mEvs.length)return<p style={{fontSize:12,color:t.sub,padding:"12px 0"}}>No events — tap a date to add</p>;
            return mEvs.map(([key,evs])=>{const d=new Date(key+"T00:00:00");return evs.map((ev,j)=><button key={`${key}-${j}`} onClick={()=>openView(key,j)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"9px 10px",borderRadius:12,marginBottom:3,cursor:"pointer",background:t.card,border:`1px solid ${t.bd}`,color:t.tx,fontFamily:"'Sora'"}}>
              <div style={{minWidth:28,textAlign:"center"}}><div style={{fontSize:14,fontWeight:700,lineHeight:1}}>{d.getDate()}</div><div style={{fontSize:8,color:t.sub,fontWeight:600,textTransform:"uppercase"}}>{DAYS[(d.getDay()+6)%7]}</div></div>
              <div style={{width:1,height:22,background:t.bd}} />
              <span style={{fontSize:16}}>{getTagEmojis(ev)}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}{ev.isRecurring?" 🔁":""}</div>
              <div style={{fontSize:10,color:t.sub}}>{getTags(ev).map(tg=>getCat(tg).label).join(" · ")}{ev.time?` · ${ev.time}`:""}</div></div>
              {ev.mood&&<span style={{fontSize:14}}>{ev.mood}</span>}
            </button>);});})()}
        </div>
      </div>}

      {/* ═══════════ DISCOVER ═══════════ */}
      {tab==="discover"&&<div style={{padding:"12px 20px"}}>
        <div className="fu" style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><h2 style={{fontFamily:t.hf,fontSize:20,fontWeight:500,marginBottom:2}}>What's On</h2>
              <p style={{fontSize:10,color:t.sub}}>{discoverUpdated?`Updated ${new Date(discoverUpdated).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}`:"Tap refresh for live events"}</p></div>
            <button onClick={refreshDiscover} disabled={refreshing} style={{padding:"7px 12px",borderRadius:9,border:`1.5px solid ${t.chipBd}`,background:t.chip,color:t.acc,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'",opacity:refreshing?0.6:1}}>
              <span style={{display:"inline-block",animation:refreshing?"spin 1s linear infinite":"none"}}>🔄</span> {refreshing?"...":"Refresh"}</button>
          </div>
          {liveDiscover&&<div style={{display:"flex",alignItems:"center",gap:3,marginTop:4}}><div style={{width:5,height:5,borderRadius:3,background:"#22c55e"}} /><span style={{fontSize:9,color:"#22c55e",fontWeight:600}}>LIVE</span></div>}
        </div>
        <div className="hs" style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:3,marginBottom:10}}>
          {[{id:"all",l:"All"},{id:"saved",l:"❤️ Saved"},{id:"nearyou",l:"📍 Near"},{id:"dining",l:"🍽️"},{id:"nightout",l:"🎶"},{id:"culture",l:"🎷"},{id:"fitness",l:"🧊"},{id:"work",l:"💡"}].map(f=>
            <button key={f.id} onClick={()=>setDiscFilter(f.id)} style={{padding:"5px 10px",borderRadius:8,whiteSpace:"nowrap",cursor:"pointer",fontFamily:"'Sora'",border:`1.5px solid ${discFilter===f.id?t.acc:t.chipBd}`,background:discFilter===f.id?t.chipA:t.chip,color:discFilter===f.id?"#fff":t.tx,fontSize:10,fontWeight:500}}>{f.l}</button>)}
        </div>
        {filteredDisc.map((ev,i)=><Card key={ev.id||i} style={{marginBottom:7,padding:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}><span style={{fontSize:20}}>{ev.emoji}</span><div><div style={{fontWeight:700,fontSize:13}}>{ev.title}</div><div style={{fontSize:10,color:t.sub}}>{ev.venue} · {ev.area}</div></div></div>
            <button onClick={()=>toggleSaved(ev.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,filter:saved.includes(ev.id)?"none":"grayscale(1) opacity(0.35)"}}>❤️</button>
          </div>
          <p style={{fontSize:11,lineHeight:1.5,opacity:0.8,marginBottom:6}}>{ev.desc}</p>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
            <Tg>{ev.tag}</Tg><Tg style={{background:t.soft,color:t.sub}}>{ev.date}</Tg>
            <a href={`https://www.google.com/search?q=${encodeURIComponent((ev.title||"")+" London")}`} target="_blank" rel="noopener noreferrer" style={{marginLeft:"auto",fontSize:10,color:t.acc,fontWeight:600,textDecoration:"none"}}>🔍</a>
            {ev.cat==="dining"&&<a href={`https://www.opentable.co.uk/s?term=${encodeURIComponent((ev.title||"")+" London")}`} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:t.acc,fontWeight:600,textDecoration:"none"}}>🍽️</a>}
          </div>
        </Card>)}
      </div>}

      {/* ═══════════ INSIGHTS ═══════════ */}
      {tab==="insights"&&<div style={{padding:"12px 20px"}}>
        {analytics.total===0?<Card style={{padding:"30px 20px",textAlign:"center"}}><div style={{fontSize:36}}>✨</div><p style={{color:t.sub,fontSize:13,marginTop:8}}>Add events to unlock insights!</p></Card>
        :<>
          <div className="hs" style={{display:"flex",gap:3,marginBottom:12,background:t.soft,borderRadius:11,padding:3,overflowX:"auto"}}>
            {[["stats","📊"],["rankings","🏆"],["wishlist","📝"],["wrap","📰"],["map","📍"],["gallery","📸"]].map(([k,ic])=>
              <button key={k} onClick={()=>setInsightTab(k)} style={{flex:"0 0 auto",padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:insightTab===k?600:500,fontFamily:"'Sora'",background:insightTab===k?t.card:"transparent",color:insightTab===k?t.acc:t.sub,whiteSpace:"nowrap"}}>{ic} {k.charAt(0).toUpperCase()+k.slice(1)}</button>)}
          </div>

          {insightTab==="stats"&&<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:12}}>
              {[{v:analytics.total,l:"Total",e:"📊"},{v:analytics.weekOut,l:"This Week",e:"🚀"},{v:analytics.topPeople.length,l:"People",e:"👥"},{v:analytics.ranked.length,l:"Rated",e:"⭐"}].map((s,i)=>
                <Card key={i} style={{padding:"11px"}}><div style={{fontSize:16}}>{s.e}</div><div style={{fontSize:22,fontWeight:700,fontFamily:t.hf,color:t.acc}}>{s.v}</div><div style={{fontSize:9,color:t.sub}}>{s.l}</div></Card>)}
            </div>
            {/* Mood breakdown */}
            {Object.keys(analytics.moodCounts).length>0&&<Card style={{marginBottom:10}}>
              <h3 style={{fontSize:12,fontWeight:600,marginBottom:8}}>😊 Mood Breakdown</h3>
              <div style={{display:"flex",gap:12}}>{Object.entries(analytics.moodCounts).sort((a,b)=>b[1]-a[1]).map(([m,c])=><div key={m} style={{textAlign:"center"}}><div style={{fontSize:24}}>{m}</div><div style={{fontSize:13,fontWeight:700,color:t.acc}}>{c}</div></div>)}</div>
            </Card>}
            {analytics.countdowns.length>0&&<Card style={{marginBottom:10}}>
              <h3 style={{fontSize:12,fontWeight:600,marginBottom:8}}>⏳ Coming Up</h3>
              {analytics.countdowns.map((ev,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:13,fontWeight:700,lineHeight:1}}>{ev.daysUntil}</span><span style={{fontSize:7}}>days</span></div>
                <div><div style={{fontWeight:600,fontSize:12}}>{ev.title}</div><div style={{fontSize:10,color:t.sub}}>{new Date(ev.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</div></div>
              </div>)}
            </Card>}
            {analytics.topCats.length>0&&<Card style={{marginBottom:10}}>
              <h3 style={{fontSize:12,fontWeight:600,marginBottom:8}}>🎯 Activities</h3>
              {analytics.topCats.slice(0,6).map(([cid,cnt])=>{const cat=getCat(cid);return<div key={cid} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}><span style={{fontSize:14}}>{cat.emoji}</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,fontWeight:500}}>{cat.label}</span><span style={{fontSize:10,color:t.sub}}>{cnt}</span></div><div style={{height:4,borderRadius:2,background:t.bar,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${cat.color},${t.acc})`,width:`${(cnt/analytics.maxCat)*100}%`}} /></div></div></div>;})}
            </Card>}
            {analytics.topPeople.length>0&&<Card style={{marginBottom:10}}>
              <h3 style={{fontSize:12,fontWeight:600,marginBottom:8}}>👥 People</h3>
              {analytics.topPeople.slice(0,6).map(([name,cnt])=><div key={name} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                <div style={{width:24,height:24,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${t.med},${t.soft})`,fontSize:10,fontWeight:700,color:t.acc}}>{name.charAt(0).toUpperCase()}</div>
                <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,fontWeight:500}}>{name}</span><span style={{fontSize:10,color:t.sub}}>{cnt}×</span></div><div style={{height:3,borderRadius:2,background:t.bar,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:t.acc,width:`${(cnt/analytics.maxPerson)*100}%`}} /></div></div>
              </div>)}
            </Card>}
          </>}

          {insightTab==="rankings"&&<>
            {analytics.ranked.length===0?<Card style={{textAlign:"center",padding:24}}><p style={{color:t.sub}}>Rate dining events to build rankings!</p></Card>
            :analytics.ranked.map((ev,i)=><Card key={i} style={{marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>#{i+1}</div>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{ev.displayName}</div><div style={{fontSize:11,color:t.acc,marginTop:1}}>{stars(ev.rating)}</div></div>
                {ev.images?.[0]&&<img src={ev.images[0]} style={{width:44,height:44,borderRadius:9,objectFit:"cover"}} />}
              </div>
              <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>{ev.foodType&&<Tg>{ev.foodType}</Tg>}{ev.priceRange&&<Tg style={{background:t.soft,color:t.sub}}>{ev.priceRange}</Tg>}</div>
              {ev.bestDish&&<div style={{marginTop:4,fontSize:11,opacity:0.8}}>⭐ {ev.bestDish}</div>}
              <div style={{display:"flex",gap:5,marginTop:6}}>{(()=>{const al=autoLink(ev);return<a href={ev.link||al.book||al.web} target="_blank" rel="noopener noreferrer" style={{padding:"5px 10px",borderRadius:7,background:t.chipA,color:"#fff",fontSize:10,fontWeight:600,textDecoration:"none"}}>{ev.link?"🔗 Website":al.book?"🍽️ Book Again":"🔍 Find"}</a>;})()}</div>
            </Card>)}
          </>}

          {insightTab==="wishlist"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <h3 style={{fontSize:13,fontWeight:600}}>📝 Places to Try</h3>
              <button onClick={()=>setShowAddWish(!showAddWish)} style={{padding:"6px 12px",borderRadius:9,border:`1.5px solid ${t.chipBd}`,background:showAddWish?t.chipA:t.chip,color:showAddWish?"#fff":t.acc,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'"}}>{showAddWish?"Cancel":"+ Add"}</button>
            </div>
            {showAddWish&&<Card style={{marginBottom:10,border:`1px solid ${t.acc}33`}}>
              <div style={{marginBottom:7}}><Lbl>Name</Lbl><input value={wishForm.name} onChange={e=>setWishForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Brat, 606 Club..." autoFocus /></div>
              <div style={{display:"flex",gap:6,marginBottom:7}}><div style={{flex:1}}><Lbl>Type</Lbl><select value={wishForm.type} onChange={e=>setWishForm(f=>({...f,type:e.target.value}))}><option value="">Select...</option>{["Restaurant","Bar","Jazz Club","Event","Experience","Café","Other"].map(t=><option key={t}>{t}</option>)}</select></div><div style={{flex:1}}><Lbl>Area</Lbl><input value={wishForm.area} onChange={e=>setWishForm(f=>({...f,area:e.target.value}))} placeholder="Shoreditch" /></div></div>
              <div style={{marginBottom:7}}><Lbl>Link</Lbl><input value={wishForm.link} onChange={e=>setWishForm(f=>({...f,link:e.target.value}))} placeholder="https://..." type="url" /></div>
              <button onClick={addWish} style={{width:"100%",padding:"11px",borderRadius:11,border:"none",cursor:"pointer",fontFamily:"'Sora'",background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",fontSize:13,fontWeight:700}}>Add</button>
            </Card>}
            {wishlist.map((w,i)=><Card key={w.id||i} style={{marginBottom:5,padding:"11px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>{w.type==="Restaurant"?"🍽️":w.type==="Bar"?"🍸":w.type==="Jazz Club"?"🎷":"📌"}</span>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{w.name}</div><div style={{fontSize:10,color:t.sub}}>{[w.type,w.area].filter(Boolean).join(" · ")}</div>
                {w.link?<a href={w.link} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:t.acc,fontWeight:600,textDecoration:"none"}}>🔗 Open</a>
                :<a href={`https://www.google.com/search?q=${encodeURIComponent(w.name+" London")}`} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:t.acc,fontWeight:600,textDecoration:"none"}}>🔍 Search</a>}
              </div>
              <button onClick={()=>removeWish(w.id)} style={{background:"none",border:"none",cursor:"pointer",color:t.sub,opacity:0.5}}>✕</button>
            </Card>)}
            {saved.length>0&&<><h4 style={{fontSize:11,fontWeight:600,color:t.sub,marginTop:10,marginBottom:6,textTransform:"uppercase"}}>Saved from Discover</h4>
              {ACTIVE_DISCOVER.filter(e=>saved.includes(e.id)).map(ev=><Card key={ev.id} style={{marginBottom:5,padding:"10px",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>{ev.emoji}</span>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{ev.title}</div><div style={{fontSize:10,color:t.sub}}>{ev.venue}</div></div>
                <button onClick={()=>toggleSaved(ev.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14}}>❤️</button>
              </Card>)}</>}
          </>}

          {insightTab==="wrap"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <h3 style={{fontSize:13,fontWeight:600}}>📰 Monthly Wrap — {MONTHS[now.getMonth()]}</h3>
              <button onClick={genWrap} disabled={wrapLoading} style={{padding:"6px 12px",borderRadius:9,border:`1.5px solid ${t.chipBd}`,background:t.chip,color:t.acc,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'",opacity:wrapLoading?0.6:1}}>
                {wrapLoading?"Generating...":"✨ Generate"}
              </button>
            </div>
            {wrapText?<Card style={{whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.6}}>{wrapText}</Card>
            :<Card style={{textAlign:"center",padding:24}}><p style={{color:t.sub,fontSize:12}}>Tap "Generate" to create your monthly wrap-up powered by AI</p></Card>}
          </>}

          {insightTab==="map"&&<><h3 style={{fontSize:13,fontWeight:600,marginBottom:10}}>📍 Places We've Been</h3><MiniMap events={events} t={t} /></>}

          {insightTab==="gallery"&&<>
            {analytics.allImages.length===0?<Card style={{textAlign:"center",padding:24}}><p style={{color:t.sub}}>Add photos to events to build your gallery!</p></Card>
            :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:3}}>
              {analytics.allImages.map((item,i)=><div key={i} style={{position:"relative",borderRadius:9,overflow:"hidden",aspectRatio:"1"}}>
                <img src={item.img} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 4px 3px",background:"linear-gradient(transparent,rgba(0,0,0,0.5))",color:"#fff",fontSize:8,fontWeight:600}}>{item.title}</div>
              </div>)}
            </div>}
          </>}
        </>}
      </div>}

      {/* ═══════════ MORE ═══════════ */}
      {tab==="more"&&<div style={{padding:"12px 20px"}}>
        <div className="hs" style={{display:"flex",gap:3,marginBottom:12,background:t.soft,borderRadius:11,padding:3,overflowX:"auto"}}>
          {[["concierge","🧠 AI"],["goals","🎯 Goals"],["birthdays","🎂 Dates"],["guest","✈️ Guest"]].map(([k,l])=>
            <button key={k} onClick={()=>setMoreTab(k)} style={{flex:"0 0 auto",padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:moreTab===k?600:500,fontFamily:"'Sora'",background:moreTab===k?t.card:"transparent",color:moreTab===k?t.acc:t.sub,whiteSpace:"nowrap"}}>{l}</button>)}
        </div>

        {/* AI Concierge */}
        {moreTab==="concierge"&&<>
          <div style={{marginBottom:10}}>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}} className="hs">
              <button onClick={planDate} style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${t.chipBd}`,background:t.chip,color:t.acc,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'",whiteSpace:"nowrap"}}>💕 Plan a Date</button>
              <button onClick={()=>planGuest()} style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${t.chipBd}`,background:t.chip,color:t.acc,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'",whiteSpace:"nowrap"}}>✈️ Guest Itinerary</button>
              <button onClick={()=>sendChat("What are the best new restaurants in London this week?","chat")} style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${t.chipBd}`,background:t.chip,color:t.acc,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'",whiteSpace:"nowrap"}}>🍽️ New Restaurants</button>
            </div>
          </div>
          <div style={{minHeight:300,maxHeight:"50vh",overflowY:"auto",marginBottom:10,padding:4}}>
            {chatMsgs.length===0&&<div style={{textAlign:"center",padding:30,color:t.sub}}><div style={{fontSize:32,marginBottom:8}}>🧠</div><p style={{fontSize:12}}>Ask me anything about London — restaurants, events, date ideas, guest itineraries...</p></div>}
            {chatMsgs.map((m,i)=><div key={i} style={{marginBottom:8,display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"85%",padding:"10px 13px",borderRadius:14,background:m.role==="user"?`linear-gradient(135deg,${t.acc},${t.acc2})`:t.card,color:m.role==="user"?"#fff":t.tx,fontSize:12,lineHeight:1.6,border:m.role==="user"?"none":`1px solid ${t.bd}`,whiteSpace:"pre-wrap"}}>{m.text}</div>
            </div>)}
            {chatLoading&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:8}}><div style={{padding:"10px 13px",borderRadius:14,background:t.card,border:`1px solid ${t.bd}`,fontSize:12,color:t.sub}}>Thinking...</div></div>}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat(chatInput);}}} placeholder="Ask me anything..." style={{flex:1}} />
            <button onClick={()=>sendChat(chatInput)} disabled={chatLoading} style={{padding:"10px 16px",borderRadius:12,border:"none",background:t.chipA,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>→</button>
          </div>
        </>}

        {/* Goals */}
        {moreTab==="goals"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <h3 style={{fontSize:13,fontWeight:600}}>🎯 Our Goals</h3>
            <button onClick={()=>setShowAddGoal(!showAddGoal)} style={{padding:"6px 12px",borderRadius:9,border:`1.5px solid ${t.chipBd}`,background:showAddGoal?t.chipA:t.chip,color:showAddGoal?"#fff":t.acc,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'"}}>{showAddGoal?"Cancel":"+ Add"}</button>
          </div>
          {showAddGoal&&<Card style={{marginBottom:10,border:`1px solid ${t.acc}33`}}>
            <div style={{marginBottom:7}}><Lbl>Goal</Lbl><input value={goalForm.text} onChange={e=>setGoalForm(f=>({...f,text:e.target.value}))} placeholder="e.g. Try 5 new restaurants this month" /></div>
            <div style={{display:"flex",gap:6,marginBottom:7}}>
              <div style={{flex:1}}><Lbl>Target</Lbl><input type="number" value={goalForm.target} onChange={e=>setGoalForm(f=>({...f,target:parseInt(e.target.value)||1}))} min={1} /></div>
              <div style={{flex:1}}><Lbl>Emoji</Lbl><div style={{display:"flex",gap:3}}>{["🎯","🍽️","🏋️","💕","🌍","📚","💰"].map(e=><button key={e} onClick={()=>setGoalForm(f=>({...f,emoji:e}))} style={{fontSize:18,background:goalForm.emoji===e?t.soft:"none",border:goalForm.emoji===e?`1px solid ${t.acc}`:"none",borderRadius:8,padding:4,cursor:"pointer"}}>{e}</button>)}</div></div>
            </div>
            <button onClick={addGoal} style={{width:"100%",padding:"11px",borderRadius:11,border:"none",cursor:"pointer",fontFamily:"'Sora'",background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",fontSize:13,fontWeight:700}}>Add Goal</button>
          </Card>}
          {goals.map(g=><Card key={g.id} style={{marginBottom:7}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{g.emoji}</span>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{g.text}</div><div style={{fontSize:10,color:t.sub}}>{g.current||0} / {g.target}</div></div>
              <button onClick={()=>removeGoal(g.id)} style={{background:"none",border:"none",cursor:"pointer",color:t.sub,opacity:0.4,fontSize:12}}>✕</button>
            </div>
            <div style={{height:8,borderRadius:4,background:t.bar,overflow:"hidden",marginBottom:6}}>
              <div style={{height:"100%",borderRadius:4,background:(g.current||0)>=g.target?"#22c55e":`linear-gradient(90deg,${t.acc},${t.acc2})`,width:`${Math.min(100,((g.current||0)/g.target)*100)}%`,transition:"width 0.4s"}} />
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>updateGoalProgress(g.id,-1)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${t.bd}`,background:t.chip,color:t.tx,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'"}}>−</button>
              <button onClick={()=>updateGoalProgress(g.id,1)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:t.chipA,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'"}}>+</button>
            </div>
            {(g.current||0)>=g.target&&<div style={{textAlign:"center",marginTop:6,fontSize:12,color:"#22c55e",fontWeight:600}}>🎉 Goal achieved!</div>}
          </Card>)}
        </>}

        {/* Birthdays & Anniversaries */}
        {moreTab==="birthdays"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <h3 style={{fontSize:13,fontWeight:600}}>🎂 Birthdays & Dates</h3>
            <button onClick={()=>setShowAddBday(!showAddBday)} style={{padding:"6px 12px",borderRadius:9,border:`1.5px solid ${t.chipBd}`,background:showAddBday?t.chipA:t.chip,color:showAddBday?"#fff":t.acc,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'"}}>{showAddBday?"Cancel":"+ Add"}</button>
          </div>
          {showAddBday&&<Card style={{marginBottom:10,border:`1px solid ${t.acc}33`}}>
            <div style={{marginBottom:7}}><Lbl>Name</Lbl><input value={bdayForm.name} onChange={e=>setBdayForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Mum, Jake, Our Anniversary" autoFocus /></div>
            <div style={{display:"flex",gap:6,marginBottom:7}}>
              <div style={{flex:1}}><Lbl>Day</Lbl><input type="number" value={bdayForm.day} onChange={e=>setBdayForm(f=>({...f,day:parseInt(e.target.value)||1}))} min={1} max={31} /></div>
              <div style={{flex:1}}><Lbl>Month</Lbl><select value={bdayForm.month} onChange={e=>setBdayForm(f=>({...f,month:parseInt(e.target.value)}))}>{MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
              <div style={{flex:1}}><Lbl>Type</Lbl><select value={bdayForm.type} onChange={e=>setBdayForm(f=>({...f,type:e.target.value}))}>{["Birthday","Anniversary","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
            </div>
            <button onClick={addBday} style={{width:"100%",padding:"11px",borderRadius:11,border:"none",cursor:"pointer",fontFamily:"'Sora'",background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",fontSize:13,fontWeight:700}}>Add</button>
          </Card>}
          {bdayCountdowns.map(b=><Card key={b.id} style={{marginBottom:6,padding:"11px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:b.daysUntil<=7?`linear-gradient(135deg,${t.acc},${t.acc2})`:t.soft,color:b.daysUntil<=7?"#fff":t.tx,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:700,lineHeight:1}}>{b.daysUntil}</span><span style={{fontSize:7}}>days</span></div>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{b.name}</div><div style={{fontSize:11,color:t.sub}}>{b.day} {MONTHS[b.month-1]} · {b.type}</div></div>
            <button onClick={()=>removeBday(b.id)} style={{background:"none",border:"none",cursor:"pointer",color:t.sub,opacity:0.4}}>✕</button>
          </Card>)}
        </>}

        {/* Guest Mode */}
        {moreTab==="guest"&&<>
          <h3 style={{fontSize:13,fontWeight:600,marginBottom:6}}>✈️ Guest Itinerary Planner</h3>
          <p style={{fontSize:11,color:t.sub,marginBottom:12}}>AI will plan a London itinerary for your visitors</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {["Weekend visit","3 days","1 week","Culture-focused","Foodie trip","Active & outdoorsy"].map(opt=>
              <button key={opt} onClick={()=>planGuest(opt)} style={{padding:"10px 16px",borderRadius:11,border:`1px solid ${t.chipBd}`,background:t.chip,color:t.acc,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'"}}>{opt}</button>)}
          </div>
          {chatMsgs.filter(m=>m.role==="assistant").slice(-1).map((m,i)=><Card key={i} style={{whiteSpace:"pre-wrap",fontSize:12,lineHeight:1.6}}>{m.text}</Card>)}
        </>}
      </div>}

      {/* ═══════════ VIEW MODAL ═══════════ */}
      {modal==="view"&&viewEv&&<div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:t.ov,backdropFilter:"blur(14px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:999,animation:"fadeIn 0.2s"}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",background:t.card,backdropFilter:"blur(30px)",borderRadius:"22px 22px 0 0",border:`1px solid ${t.bd}`,padding:"14px 18px 26px",animation:"scaleIn 0.3s"}}>
          <div style={{width:28,height:3,borderRadius:2,background:t.sub,opacity:0.2,margin:"0 auto 10px"}} />
          {viewEv.images?.length>0&&<div className="hs" style={{display:"flex",gap:5,overflowX:"auto",marginBottom:12}}>{viewEv.images.map((img,i)=><img key={i} src={img} style={{height:140,borderRadius:11,objectFit:"cover",flexShrink:0}} />)}</div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
            <h2 style={{fontFamily:t.hf,fontSize:20,fontWeight:500,flex:1}}>{viewEv.title}{viewEv.isRecurring?" 🔁":""}</h2>
            {viewEv.mood&&<span style={{fontSize:20}}>{viewEv.mood}</span>}
            {viewEv.rating>0&&<span style={{fontSize:13,color:t.acc,marginLeft:6}}>{stars(viewEv.rating)}</span>}
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{getTags(viewEv).map(tg=><Tg key={tg}>{getCat(tg).emoji} {getCat(tg).label}</Tg>)}{viewEv.recurrence&&viewEv.recurrence!=="None"&&<Tg style={{background:t.soft,color:t.sub}}>🔁 {viewEv.recurrence}</Tg>}</div>
          <div style={{fontSize:12,color:t.sub,marginBottom:10,lineHeight:1.7}}>
            <div>📅 {new Date(viewEv.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
            {viewEv.time&&<div>🕐 {viewEv.time}</div>}
            {viewEv.duration&&<div>⏱️ {viewEv.duration}</div>}
            {viewEv.people&&<div>👥 {viewEv.people}</div>}
            {viewEv.address&&<div>📍 {viewEv.address}</div>}
            {viewEv.foodType&&<div>🍽️ {viewEv.restaurantName||viewEv.title} · {viewEv.foodType}{viewEv.priceRange?` · ${viewEv.priceRange}`:""}</div>}
            {viewEv.bestDish&&<div>⭐ Best dish: {viewEv.bestDish}</div>}
            {viewEv.notes&&<div style={{marginTop:4,fontStyle:"italic",opacity:0.7}}>"{viewEv.notes}"</div>}
          </div>
          {/* Links */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
            {viewEv.link&&<a href={viewEv.link} target="_blank" rel="noopener noreferrer" style={{padding:"7px 12px",borderRadius:9,background:t.chipA,color:"#fff",fontSize:11,fontWeight:600,textDecoration:"none"}} onClick={e=>e.stopPropagation()}>🔗 Open</a>}
            {(()=>{const al=autoLink(viewEv);return<>
              {al.book&&<a href={al.book} target="_blank" rel="noopener noreferrer" style={{padding:"7px 12px",borderRadius:9,background:viewEv.link?t.soft:t.chipA,color:viewEv.link?t.acc:"#fff",fontSize:11,fontWeight:600,textDecoration:"none",border:viewEv.link?`1px solid ${t.chipBd}`:"none"}} onClick={e=>e.stopPropagation()}>🍽️ OpenTable</a>}
              <a href={al.web} target="_blank" rel="noopener noreferrer" style={{padding:"7px 12px",borderRadius:9,background:t.soft,color:t.acc,fontSize:11,fontWeight:600,textDecoration:"none",border:`1px solid ${t.chipBd}`}} onClick={e=>e.stopPropagation()}>🔍 Google</a>
            </>;})()}
          </div>
          <div style={{display:"flex",gap:6}}>
            {!viewEv.isRecurring&&<button onClick={delEv} style={{padding:"11px 0",borderRadius:11,flex:1,cursor:"pointer",fontFamily:"'Sora'",border:"1.5px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.06)",color:"#ef4444",fontSize:13,fontWeight:600}}>Delete</button>}
            <button onClick={openEdit} style={{padding:"11px 0",borderRadius:11,flex:2,border:"none",cursor:"pointer",fontFamily:"'Sora'",background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",fontSize:13,fontWeight:700,boxShadow:t.glow}}>Edit Event</button>
          </div>
        </div>
      </div>}

      {/* ═══════════ ADD/EDIT MODAL ═══════════ */}
      {(modal==="add"||modal==="edit")&&<div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:t.ov,backdropFilter:"blur(14px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:999,animation:"fadeIn 0.2s"}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",background:t.card,backdropFilter:"blur(30px)",borderRadius:"22px 22px 0 0",border:`1px solid ${t.bd}`,padding:"14px 18px 26px",animation:"scaleIn 0.3s"}}>
          <div style={{width:28,height:3,borderRadius:2,background:t.sub,opacity:0.2,margin:"0 auto 10px"}} />
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h2 style={{fontFamily:t.hf,fontSize:18,fontWeight:500}}>{modal==="edit"?"Edit Event":"New Event"}</h2>
            {selDate&&<Tg>{new Date(selDate+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</Tg>}
          </div>
          <div style={{marginBottom:9}}><Lbl>What's happening</Lbl><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Dinner at Moro, ARC class..." autoFocus /></div>
          <div style={{display:"flex",gap:6,marginBottom:9}}>
            <div style={{flex:1}}><Lbl>Time</Lbl><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} /></div>
            <div style={{flex:1}}><Lbl>Duration</Lbl><input value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="2 hours, 3 days..." />
              <div style={{display:"flex",gap:3,marginTop:4,flexWrap:"wrap"}}>{["1 hour","2 hours","Half day","Full day","Weekend","1 week","2 weeks"].map(d=><button key={d} onClick={()=>setForm(f=>({...f,duration:d}))} style={{padding:"3px 6px",borderRadius:6,border:`1px solid ${form.duration===d?t.acc:t.chipBd}`,background:form.duration===d?t.chipA:t.chip,color:form.duration===d?"#fff":t.tx,fontSize:9,cursor:"pointer",fontFamily:"'Sora'"}}>{d}</button>)}</div>
            </div>
          </div>
          <div style={{marginBottom:9}}><Lbl>Tags (multiple)</Lbl>
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{CATS.map(cat=><button key={cat.id} onClick={()=>toggleTag(cat.id)} style={{padding:"4px 8px",borderRadius:7,cursor:"pointer",fontFamily:"'Sora'",border:`1.5px solid ${form.tags.includes(cat.id)?t.acc:t.chipBd}`,background:form.tags.includes(cat.id)?t.chipA:t.chip,color:form.tags.includes(cat.id)?"#fff":t.tx,fontSize:10,fontWeight:500}}>{cat.emoji} {cat.label}</button>)}</div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:9}}>
            <div style={{flex:1}}><Lbl>People</Lbl><input value={form.people} onChange={e=>setForm(f=>({...f,people:e.target.value}))} placeholder="Jake, Mum..." /></div>
            <div style={{flex:1}}><Lbl>Repeat</Lbl><select value={form.recurrence} onChange={e=>setForm(f=>({...f,recurrence:e.target.value}))}>{RECURRENCE_OPTS.map(r=><option key={r}>{r}</option>)}</select></div>
          </div>
          {/* Mood */}
          <div style={{marginBottom:9}}><Lbl>Mood / Vibe (after the event)</Lbl>
            <div style={{display:"flex",gap:6}}>{MOODS.map(m=><button key={m.emoji} onClick={()=>setForm(f=>({...f,mood:f.mood===m.emoji?"":m.emoji}))} style={{fontSize:24,padding:4,background:form.mood===m.emoji?t.soft:"none",border:form.mood===m.emoji?`2px solid ${t.acc}`:"2px solid transparent",borderRadius:10,cursor:"pointer"}}>{m.emoji}</button>)}</div>
          </div>
          {/* Dining fields */}
          {form.tags.includes("dining")&&<>
            <div style={{marginBottom:9}}><Lbl>Restaurant Name</Lbl><input value={form.restaurantName} onChange={e=>setForm(f=>({...f,restaurantName:e.target.value}))} placeholder="Moro, Brat, Clove Club..." /></div>
            <div style={{marginBottom:9}}><Lbl>Rating</Lbl><div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setForm(f=>({...f,rating:f.rating===n?0:n}))} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:n<=form.rating?t.acc:t.bd}}>{n<=form.rating?"★":"☆"}</button>)}</div></div>
            <div style={{display:"flex",gap:6,marginBottom:9}}>
              <div style={{flex:1}}><Lbl>Food Type</Lbl><select value={form.foodType} onChange={e=>setForm(f=>({...f,foodType:e.target.value}))}><option value="">Select...</option>{FOOD_TYPES.map(f=><option key={f}>{f}</option>)}</select></div>
              <div style={{flex:1}}><Lbl>Price</Lbl><div style={{display:"flex",gap:3}}>{PRICE_RANGES.map(p=><button key={p} onClick={()=>setForm(f=>({...f,priceRange:f.priceRange===p?"":p}))} style={{flex:1,padding:"9px 0",borderRadius:7,border:`1.5px solid ${form.priceRange===p?t.acc:t.chipBd}`,background:form.priceRange===p?t.chipA:t.chip,color:form.priceRange===p?"#fff":t.tx,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Sora'"}}>{p}</button>)}</div></div>
            </div>
            <div style={{marginBottom:9}}><Lbl>Best Dish</Lbl><input value={form.bestDish} onChange={e=>setForm(f=>({...f,bestDish:e.target.value}))} placeholder="What was the standout?" /></div>
          </>}
          {/* Link */}
          <div style={{marginBottom:9}}><Lbl>Link (website / booking)</Lbl><input value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://..." type="url" /></div>
          {/* Location */}
          <div style={{marginBottom:9}}><Lbl>Location</Lbl>
            <div style={{display:"flex",gap:5}}><input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="Address or place" style={{flex:1}} onBlur={searchAddress} />
              <button onClick={addLocation} style={{padding:"9px 11px",borderRadius:11,border:`1.5px solid ${t.chipBd}`,background:t.chip,fontSize:13,cursor:"pointer",flexShrink:0}}>📍</button></div>
            {form.lat&&<p style={{fontSize:9,color:t.sub,marginTop:3}}>✓ Saved ({form.lat.toFixed(3)},{form.lng.toFixed(3)})</p>}
          </div>
          {/* Photos */}
          <div style={{marginBottom:9}}><Lbl>Photos</Lbl>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {form.images.map((img,i)=><div key={i} style={{position:"relative",width:56,height:56,borderRadius:9,overflow:"hidden"}}><img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}} /><button onClick={()=>removeImage(i)} style={{position:"absolute",top:1,right:1,width:18,height:18,borderRadius:9,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>)}
              {form.images.length<6&&<label style={{width:56,height:56,borderRadius:9,border:`2px dashed ${t.bd}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,color:t.sub}}>+<input type="file" accept="image/*" multiple onChange={addImage} style={{display:"none"}} /></label>}
            </div>
          </div>
          <div style={{marginBottom:14}}><Lbl>Notes</Lbl><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Booking ref, what to bring..." rows={2} /></div>
          <div style={{display:"flex",gap:6}}>
            {modal==="edit"&&!viewEv?.isRecurring&&<button onClick={delEv} style={{padding:"11px 0",borderRadius:11,flex:1,cursor:"pointer",fontFamily:"'Sora'",border:"1.5px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.06)",color:"#ef4444",fontSize:13,fontWeight:600}}>Delete</button>}
            <button onClick={saveEv} style={{padding:"11px 0",borderRadius:11,flex:2,border:"none",cursor:"pointer",fontFamily:"'Sora'",background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",fontSize:13,fontWeight:700,boxShadow:t.glow}}>{modal==="edit"?"Save":"Add Event"}</button>
          </div>
        </div>
      </div>}
    </div>);
}
