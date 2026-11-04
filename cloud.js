(()=>{
'use strict';
const URL='https://pxyhvlvbzseikbcsgtsd.supabase.co';
const KEY='sb_publishable_5gwaAVv8762fM4KFlFPH9A_FM6o1-H6';
const VAPID_PUBLIC_KEY='BKY9AY1ErBkRzj2y7FvgK8jRP2W1r6JmrKFSgzpBsYQ2HLyZJ72x7V3W9jJeJ-fIHO1k0MMfvaC8Rr9LzTydsHY';
function pushKeyBytes(base64){const raw=atob(base64.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-base64.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function pushRegistration(){if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('Push notifications are unavailable in this browser. On iPhone, open Fantasy Archive from its Home Screen icon.');return navigator.serviceWorker.ready}
async function refreshPushButton(){const b=document.getElementById('accountPush');if(!b||!user)return;try{const reg=await pushRegistration();const sub=await reg.pushManager.getSubscription();if(document.getElementById('accountPush')===b)b.textContent=sub?'Disable Notifications':'Enable Notifications'}catch(e){if(document.getElementById('accountPush')===b){b.textContent='Notifications Unavailable';b.title=e.message}}}
async function togglePushNotifications(){const b=document.getElementById('accountPush');if(b)b.disabled=true;try{const reg=await pushRegistration();let sub=await reg.pushManager.getSubscription();if(sub){const {error:e}=await client.from('push_subscriptions').delete().eq('endpoint',sub.endpoint).eq('user_id',user.id);if(e)throw e;await sub.unsubscribe();msg('Notifications disabled on this device')}else{if(Notification.permission==='denied')throw Error('Notifications are blocked. Enable them in your phone settings.');const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notification permission was not granted');sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyBytes(VAPID_PUBLIC_KEY)});const json=sub.toJSON();const {error:e}=await client.from('push_subscriptions').insert({user_id:user.id,endpoint:sub.endpoint,p256dh:json.keys.p256dh,auth_secret:json.keys.auth});if(e){await sub.unsubscribe();throw e}msg('Council notifications enabled on this device')}}catch(e){error(e)}finally{if(b)b.disabled=false;refreshPushButton()}}
const load=()=>new Promise((resolve,reject)=>{if(window.supabase?.createClient)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Could not load Supabase library'));document.head.append(s)});
let client,user,project,section='chapters',active=null,records=[],projects=[],timer=null,revision=0,saveBusy=false,chronicleReady=false,chapterDrafts={},writerNames={},liveLoop=null,liveTick=0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const ARCHIVE_RELEASE={version:'0.9.12',date:'2026-11-03',description:'Added opt-in Council push notifications for supported iPhone and Android devices.'};
const ARCHIVE_HISTORY=[
 ARCHIVE_RELEASE,
 {version:'0.9.11',date:'2026-11-03',description:'Prepared installable Fantasy Archive PWA with Home Screen support.'},
 {version:'0.9.10',date:'2026-11-03',description:'Made World navigation wrap into accessible rows on phones.'},
 {version:'0.9.9',date:'2026-11-03',description:'Added a simple master Chronicle timeline for each realm.'},
 {version:'0.9.8',date:'2026-11-03',description:'Added automatic manuscript backlinks.'},
 {version:'0.9.7',date:'2026-11-03',description:'Added reviewed Detect Links for chapters and World entries.'},
 {version:'0.9.6',date:'2026-11-03',description:'Removed temporary wiki tap diagnostics.'},
 {version:'0.9.5',date:'2026-11-03',description:'Added permanent-ID link picker and tap diagnostics.'},
 {version:'0.9.4',date:'2026-11-03',description:'Separated update history and checked wiki destinations directly.'},
 {version:'0.9.3',date:'2026-11-03',description:'Added an in-app version and update history.'},
 {version:'0.9.2',date:'2026-11-03',description:'Fixed wiki links opening linked World entries.'},
 {version:'0.9.1',date:'2026-11-03',description:'Fixed realm search database query.'},
 {version:'0.9.0',date:'2026-11-03',description:'Introduced realm-wide World search and wiki-style links.'},
 {version:'0.8.9',date:'2026-11-03',description:'Fixed phantom scrolling on short pages and locked the underlying page.'}
];
const ARCHIVE_LOADED_AT=new Date();
const styles=document.createElement('style');styles.textContent=`
#cloudApp{position:fixed;inset:0;z-index:30;background:#111410;color:#e9e0ca;overflow:auto;font-family:Georgia,serif}
#cloudApp *{box-sizing:border-box}#cloudApp button,#cloudApp input,#cloudApp textarea,#cloudApp select{font:inherit}
#cloudApp button{cursor:pointer}#cloudApp .wrap{max-width:1050px;margin:auto;padding:24px 18px 90px}
#cloudApp .bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid #484637;padding-bottom:17px;margin-bottom:22px}
#cloudApp h1{font-weight:normal;color:#c7a66b;font-size:26px;margin:0}#cloudApp h2{font-weight:normal;font-size:23px}
#cloudApp .muted{color:#a7aa99;font:13px/1.6 system-ui}#cloudApp .btn{border:1px solid #635941;background:#282c24;color:#e9e0ca;border-radius:7px;padding:10px 13px}
#cloudApp .gold{background:#b39560;color:#141713;font-weight:bold}#cloudApp .panel{border:1px solid #474b3e;background:#1b201b;border-radius:10px;padding:20px}
#cloudApp .grid{display:grid;grid-template-columns:245px 1fr;gap:15px}#cloudApp input,#cloudApp textarea,#cloudApp select{background:#10150f;color:#f1e6cf;border:1px solid #525947;border-radius:6px;padding:12px;width:100%}
#cloudApp textarea{min-height:125px;line-height:1.65;resize:vertical}#cloudApp textarea.long{min-height:350px}
#cloudApp label{display:block;font:12px system-ui;color:#c7a66b;margin:14px 0 6px}
#cloudApp .tabs{display:flex;gap:8px;overflow:auto;margin:14px 0 20px}#cloudApp .tabs button{white-space:nowrap}
#cloudApp .item{display:block;width:100%;text-align:left;padding:12px;margin:5px 0;border:1px solid #424638;border-radius:6px;background:#252a22;color:#eee1cb}
#cloudApp .item.on{border-color:#c7a66b}#cloudApp .status{font:12px system-ui;color:#c7a66b;min-height:18px}
#cloudApp .auth{max-width:420px;margin:8vh auto}#cloudApp .actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
@media(max-width:680px){#cloudApp .grid{grid-template-columns:1fr}#cloudApp .wrap{padding:17px 12px 90px}#cloudApp .panel{padding:15px}}

#cloudApp .realm-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}
#cloudApp .realm-head h2{margin:0}
#cloudApp .primary-nav{display:flex;gap:8px;margin:12px 0 18px}
#cloudApp .primary-nav button{flex:1}
#cloudApp .world-nav{display:flex;gap:8px;margin:0 0 16px}
#cloudApp .world-nav button{flex:1;min-width:0}
@media(max-width:680px){#cloudApp .world-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}#cloudApp .world-nav button{width:100%;padding:10px 5px;font-size:13px;white-space:normal}}
#cloudApp .account-menu{position:relative}
#cloudApp .account-menu summary{cursor:pointer;list-style:none;border:1px solid #635941;background:#282c24;border-radius:7px;padding:10px 13px;font:14px system-ui}
#cloudApp .account-menu summary::-webkit-details-marker{display:none}
#cloudApp .account-options{position:absolute;right:0;top:calc(100% + 6px);z-index:50;min-width:205px;padding:7px;border:1px solid #635941;background:#222820;border-radius:9px;box-shadow:0 12px 30px #0009}
#cloudApp .account-options button{display:block;width:100%;margin:3px 0;text-align:left}
#cloudApp .mobile-nav{display:none}
#cloudApp .entry-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}
#cloudApp .entry-heading h3{margin:0;font-size:18px;font-weight:normal}
#cloudApp .entry-heading .actions{gap:5px}
#cloudApp .entry-heading button{padding:8px 10px}
@media(max-width:680px){
#cloudApp .wrap{padding-bottom:calc(112px + env(safe-area-inset-bottom))}
#cloudApp .primary-nav{display:none}
#cloudApp .mobile-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;z-index:45;padding:8px 10px calc(8px + env(safe-area-inset-bottom));gap:7px;background:#1b211b;border-top:1px solid #5b5846;box-shadow:0 -7px 24px #0007}
#cloudApp .mobile-nav button{border:0;border-radius:9px;background:transparent;color:#b9b6a7;min-height:57px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:3px;font:12px system-ui}
#cloudApp .mobile-nav button[aria-current="page"]{background:#b39560;color:#151a14;font-weight:bold}
#cloudApp .nav-symbol{font-size:20px}
#cloudApp .entry-list.collapsed{display:none}
#cloudApp .entry-list{max-height:230px;overflow:auto}
#cloudApp textarea.long{min-height:52vh}
#cloudApp h1{font-size:21px}
}

#cloudApp .focus-toggle{margin-left:auto}
#cloudApp .word-count{font:12px system-ui;color:#a7aa99}
#cloudApp .editor-tools{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
#cloudApp.focus-mode .bar,#cloudApp.focus-mode .realm-head,#cloudApp.focus-mode .primary-nav,#cloudApp.focus-mode .mobile-nav,#cloudApp.focus-mode .world-nav,#cloudApp.focus-mode .grid>aside,#cloudApp.focus-mode #chapterPresence,#cloudApp.focus-mode #chapterHistory,#cloudApp.focus-mode #refreshChapter,#cloudApp.focus-mode #deleteEntry,#cloudApp.focus-mode #historyPanel{display:none!important}
#cloudApp.focus-mode .wrap{max-width:900px;padding:15px 12px 30px}
#cloudApp.focus-mode .grid{display:block}
#cloudApp.focus-mode #editor{border:0;background:transparent;padding:0;max-width:780px;margin:auto}
#cloudApp.focus-mode #editor>h2{display:none}
#cloudApp.focus-mode #field_body{min-height:75vh;font-size:18px;line-height:1.85;padding:22px;background:#161b16;border:1px solid #414b3b}
#cloudApp.focus-mode #field_title{font-size:24px;background:transparent;border:0;border-bottom:1px solid #484637;border-radius:0}
#cloudApp.focus-mode #editor>p.muted{display:none}
#cloudApp.focus-mode #editor>label{margin-top:12px}
#cloudApp.focus-mode #cloudStatus{display:none}

/* Writer's Desk: immersive, phone-first focus view */
#cloudApp.focus-mode .wrap{max-width:none;width:100%;padding:4px 8px 12px}
#cloudApp.focus-mode .grid{display:block;margin:0}
#cloudApp.focus-mode #editor{max-width:none;width:100%;padding:0;border:0;border-radius:0;background:transparent}
#cloudApp.focus-mode .editor-tools{position:sticky;top:0;z-index:5;min-height:32px;display:flex;justify-content:flex-end;gap:10px;background:#111410eF;padding:3px 2px}
#cloudApp.focus-mode #focusToggle{order:2;font:11px system-ui;padding:5px 7px;min-height:26px;border-radius:5px;background:#252b23;color:#c9c1ab;border-color:#454b3c;font-weight:normal}
#cloudApp.focus-mode .word-count{order:1;font-size:11px}
#cloudApp.focus-mode #field_title{font-size:20px;padding:6px 3px;margin:0;width:100%}
#cloudApp.focus-mode #editor>label{font-size:10px;margin:7px 2px 3px}
#cloudApp.focus-mode #field_body{display:block;width:100%;min-height:calc(100dvh - 145px);font-size:18px;line-height:1.7;padding:12px 10px;margin:0;border-radius:4px}
#cloudApp.focus-mode #editor>.actions:last-child{margin-top:8px!important}
@media(max-width:680px){
 #cloudApp.focus-mode .wrap{padding:2px 5px 8px}
 #cloudApp.focus-mode #field_body{min-height:calc(100dvh - 128px);padding:10px 8px;font-size:17px;line-height:1.7}
 #cloudApp.focus-mode #field_title{font-size:19px}
}

#cloudApp.focus-mode #field_body{height:calc(var(--writer-height,100dvh) - 145px);min-height:180px;overflow-y:auto;-webkit-overflow-scrolling:touch;resize:none;scroll-padding-bottom:60px}
@media(max-width:680px){#cloudApp.focus-mode #field_body{height:calc(var(--writer-height,100dvh) - 125px);min-height:160px}}

#cloudApp .link-card{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px;margin:7px 0;background:#252c23;border:1px solid #48513f;border-radius:7px}#cloudApp .link-card button{min-width:0}#cloudApp .link-label{font:12px system-ui;color:#c7a66b}#cloudApp .link-create{display:grid;grid-template-columns:1fr 1fr;gap:8px}#cloudApp .link-create button{grid-column:1/-1}#cloudApp .link-create select{min-width:0}#cloudApp .link-section{margin-top:24px;border-top:1px solid #4b4c3d;padding-top:12px}
@media(max-width:680px){#cloudApp .link-create{grid-template-columns:1fr}}

#cloudApp .faction-group{border:1px solid #444d3d;border-radius:8px;margin:9px 0;overflow:hidden}#cloudApp .faction-group summary{cursor:pointer;padding:11px;background:#252d24;color:#cdb47f;font:14px system-ui}#cloudApp .faction-group .group-items{padding:6px}#cloudApp .faction-membership{margin:18px 0;padding:12px;border:1px solid #48503e;border-radius:8px}#cloudApp .faction-membership label{display:flex;gap:8px;align-items:center;margin:8px 0;color:#e9e0ca;font:14px system-ui}#cloudApp .faction-membership input[type=checkbox]{width:auto;flex:none}#cloudApp .faction-membership h3{margin:0 0 8px;font-weight:normal}

@media(max-width:680px){#cloudApp.world-detail .grid>aside{display:none}#cloudApp.world-detail .grid{display:block}#cloudApp.world-detail #editor{width:100%;margin:0}}#cloudApp .world-profile-bar{display:flex;justify-content:space-between;gap:12px;margin-bottom:18px}#cloudApp .world-profile-title{font-size:clamp(26px,5vw,38px);margin:10px 0 22px}#cloudApp .world-read-section{padding:14px 0;border-bottom:1px solid #3d4639}#cloudApp .world-read-section h3{font:13px system-ui;color:#c4a76f;margin:0 0 9px}#cloudApp .world-read-section p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7;margin:0}#cloudApp.world-detail .grid #editor{max-width:850px;margin-inline:auto}

@media(max-width:680px){#cloudApp.chapter-detail .grid>aside{display:none}#cloudApp.chapter-detail .grid{display:block}#cloudApp.chapter-detail #editor{width:100%;margin:0}}
#cloudApp.chapter-detail .grid #editor{max-width:850px;margin-inline:auto}
#cloudApp .chapter-reader{max-width:700px;margin:10px auto 50px}
#cloudApp .chapter-reader h1{font-size:clamp(25px,5vw,36px);line-height:1.3;margin:18px 0 26px;color:#eadcc0}
#cloudApp .chapter-prose{font-size:18px;line-height:1.85;overflow-wrap:anywhere;white-space:pre-wrap;color:#e6dece}
#cloudApp .chapter-edit-bar{display:flex;justify-content:space-between;gap:10px;margin-bottom:12px}
#cloudApp.focus-mode .chapter-edit-bar,#cloudApp.focus-mode #editor>h2,#cloudApp.focus-mode #editor>p.muted,#cloudApp.focus-mode #editor>label,#cloudApp.focus-mode #field_title,#cloudApp.focus-mode .word-count,#cloudApp.focus-mode #editor>.actions,#cloudApp.focus-mode #editor>#chapterPresence,#cloudApp.focus-mode #historyPanel{display:none!important}
#cloudApp.focus-mode .editor-tools{position:fixed;top:8px;right:10px;background:transparent;padding:0;min-height:0;z-index:15}
#cloudApp.focus-mode #focusToggle{font:11px system-ui;padding:5px 8px;opacity:.55;background:#202820}
#cloudApp.focus-mode #focusToggle:focus{opacity:1}
#cloudApp.focus-mode #field_body{height:calc(var(--writer-height,100dvh) - 12px);min-height:150px;padding:34px 12px 14px;border:0;background:#161b16}
#cloudApp.focus-mode .wrap{padding:0!important}

#cloudApp.chapter-list .grid{display:block;max-width:850px;margin-inline:auto}
#cloudApp.chapter-list .grid>aside{width:100%}
#cloudApp.chapter-list .grid>#editor{display:none!important}
#cloudApp.chapter-detail .grid{display:block}
#cloudApp.chapter-detail .grid>aside{display:none!important}
#cloudApp.chapter-detail .grid>#editor{display:block;width:100%;max-width:850px;margin-inline:auto}
#cloudApp.chapter-detail .world-profile-bar,#cloudApp.chapter-detail .chapter-edit-bar{position:sticky;top:0;z-index:10;background:#111410;padding:9px 0}

/* Chapter list and chapter detail are distinct screens on all devices. */
#cloudApp.chapter-list .grid{display:block;max-width:850px;margin-inline:auto}
#cloudApp.chapter-list .grid>aside{display:block;width:100%}
#cloudApp.chapter-list #editor{display:none}
#cloudApp.chapter-detail:not(.focus-mode) .grid{display:block}
#cloudApp.chapter-detail:not(.focus-mode) .grid>aside{display:none!important}
#cloudApp.chapter-detail:not(.focus-mode) #editor{display:block;width:100%;max-width:850px;margin-inline:auto}
#cloudApp.chapter-detail:not(.focus-mode) .world-profile-bar,
#cloudApp.chapter-detail:not(.focus-mode) .chapter-edit-bar{position:sticky;top:0;z-index:12;background:#171c17;padding:10px 0;border-bottom:1px solid #41483d}

/* Full-width, unboxed manuscript chapter index. */
#cloudApp.chapter-list .wrap{max-width:none;width:100%}
#cloudApp.chapter-list .grid{max-width:none;width:100%;margin:0}
#cloudApp.chapter-list .grid>aside{border:0;border-radius:0;box-shadow:none;background:transparent;padding:8px 0;width:100%}
#cloudApp.chapter-list .entry-list{width:100%;max-width:none}
#cloudApp.chapter-list .entry-list .item{width:100%;text-align:left}
@media(max-width:680px){#cloudApp.chapter-list .wrap{padding-left:12px;padding-right:12px}}

/* Chapter and World indices use the outer Cloud Archive scroller. */
#cloudApp.chapter-list .entry-list,#cloudApp.world-list .entry-list{max-height:none!important;height:auto!important;overflow:visible!important}
#cloudApp.chapter-list .entry-list.collapsed{display:block}
#cloudApp.chapter-list #toggleEntries{display:none}
#cloudApp.chapter-list .grid,#cloudApp.chapter-list .grid>aside{max-height:none!important;height:auto!important;overflow:visible!important}
#cloudApp.chapter-list .wrap{max-width:none;width:100%;padding-left:12px;padding-right:12px}
#cloudApp.chapter-list .grid{display:block;width:100%;max-width:none;margin:0}
#cloudApp.chapter-list .grid>aside{display:block;width:100%;padding:0!important;border:0;border-radius:0;box-shadow:none;background:transparent}
#cloudApp.chapter-list #editor{display:none!important}
#cloudApp.chapter-list .entry-heading{padding:8px 0 14px}
#cloudApp.chapter-list .entry-list .item{display:block;width:100%;margin:0;padding:17px 4px;border:0;border-bottom:1px solid #3b4339;border-radius:0;background:transparent;box-shadow:none;color:#eee1cb;font-size:1.05em;text-align:left}
#cloudApp.chapter-list .entry-list .item:first-child{border-top:1px solid #3b4339}
#cloudApp.chapter-list .entry-list .item:active{background:#252b23}
#cloudApp.world-list .grid{display:block;max-width:none;overflow:visible}
#cloudApp.world-list .grid>aside{width:100%;max-height:none;overflow:visible}
#cloudApp.world-list #editor{display:none}
/* One viewport-bound scroll surface. Never force the page taller than its content. */
#cloudApp{overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain}
#cloudApp.scroll-locked{overflow-y:hidden!important;touch-action:pan-x}
html.archive-open,html.archive-open body{overflow:hidden!important;height:100%;overscroll-behavior:none}
#cloudApp:not(.focus-mode) .wrap{height:auto;min-height:0!important;padding-bottom:0!important}
#cloudApp:not(.focus-mode).needs-nav-clearance .wrap{padding-bottom:calc(92px + env(safe-area-inset-bottom))!important}
#cloudApp:not(.focus-mode) .grid,#cloudApp:not(.focus-mode) .grid>aside{min-height:0}

#cloudApp .wiki-search{margin:12px 0;padding:10px;background:#1a211a;border:1px solid #454a3d;border-radius:8px}
#cloudApp .wiki-search input{width:100%;padding:11px;font-size:16px;background:#111710;color:#eee1cb;border:1px solid #77725b;border-radius:6px}
#cloudApp #wikiResults button{display:block;width:100%;text-align:left;padding:10px;background:transparent;border:0;border-bottom:1px solid #41483b;color:#e8dcc7}
#cloudApp #wikiResults small{color:#b4a88f}
#cloudApp .wiki-link{font:inherit;color:#e4bd75;text-decoration:underline;background:none;border:0;padding:0;cursor:pointer}
#cloudApp .wiki-missing{color:#b8aa94;border-bottom:1px dashed #817760}

#cloudApp .release-history{max-width:650px;margin:18px auto;padding:18px;border:1px solid #5b5845;border-radius:10px;background:#1b201b}
#cloudApp .release-history h2{color:#d2b37a;margin-top:0}
#cloudApp .release-history article{border-top:1px solid #424738;padding:12px 0}
#cloudApp .release-history article p{margin:5px 0;line-height:1.55}
#cloudApp .release-history .release-current{color:#e3c38a}
`;document.head.append(styles);
const root=document.createElement('div');root.id='cloudApp';document.body.append(root);
function updateWriterHeight(){root.style.setProperty('--writer-height',Math.round(window.visualViewport?.height||window.innerHeight)+'px')}
updateWriterHeight();window.addEventListener('resize',updateWriterHeight);window.visualViewport?.addEventListener('resize',updateWriterHeight);

const msg=(t)=>{const x=document.getElementById('cloudStatus');if(x)x.textContent=t};
const button=(label,id,extra='')=>'<button class="btn '+extra+'" id="'+id+'">'+label+'</button>';
const error=e=>{msg(e.message||String(e));console.error(e)};
async function init(){root.innerHTML='<div class="wrap"><p>✦ Opening the cloud archive…</p></div>';try{await load();client=window.supabase.createClient(URL,KEY);const {data:{session}}=await client.auth.getSession();user=session?.user||null;client.auth.onAuthStateChange((_event,session)=>{const next=session?.user||null;if(next?.id!==user?.id){user=next;project=null;active=null;render()}});await render()}catch(e){root.innerHTML='<div class="wrap"><h2>Connection unavailable</h2><p>'+esc(e.message)+'</p>'+button('Try again','retry')+'</div>';document.getElementById('retry').onclick=init}}
function frame(inner){root.classList.remove('focus-mode');root.innerHTML='<div class="wrap"><div class="bar"><div><h1>✦ THE FANTASY ARCHIVE</h1><div class="muted">The Scriptorium</div></div>'+(user?'<details class="account-menu"><summary aria-label="Account menu">☰ Menu</summary><div class="account-options">'+button('My Profile','accountProfile')+button('Collaborators','accountMembers')+button('Realm Settings','accountSettings')+button('Switch realm','accountRealms')+button('About / Updates','accountUpdates')+button('Enable Notifications','accountPush')+button('Sign out','signout')+'</div></details>':button('Local prototype','local'))+'</div>'+inner+'<p class="status" id="cloudStatus" role="status"></p></div>';if(user){document.getElementById('signout').onclick=async()=>{stopLive();await client.auth.signOut();user=null;project=null;render()};for(const [id,dest] of [['accountProfile','profile'],['accountMembers','members'],['accountSettings','settings']])document.getElementById(id).onclick=()=>project?navigate(dest):msg('Open a realm first');document.getElementById('accountRealms').onclick=()=>{stopLive();project=null;active=null;projectList()};document.getElementById('accountUpdates').onclick=showArchiveUpdates;document.getElementById('accountPush').onclick=togglePushNotifications;refreshPushButton()}else document.getElementById('local').onclick=()=>{root.style.display='none';document.documentElement.classList.remove('archive-open');document.getElementById('cloudLaunch').hidden=false}}
function showArchiveUpdates(){
 if(document.getElementById('archiveUpdatesScreen'))return;
 const wrap=root.querySelector('.wrap');if(!wrap)return;
 const previous=wrap.innerHTML;
 const previousClasses=root.className;
 root.classList.remove('world-detail','world-list','chapter-detail','chapter-list');
 const stamp=ARCHIVE_LOADED_AT.toLocaleString();
 const content='<section class="release-history" id="archiveUpdates"><h2>About Fantasy Archive</h2><p class="release-current">Running version '+esc(ARCHIVE_RELEASE.version)+'</p><p class="muted">Release date: '+esc(ARCHIVE_RELEASE.date)+' · Loaded on this device: '+esc(stamp)+'</p><p class="muted">This version is reported by the JavaScript currently running on your device.</p>'+button('← Back to Archive','closeArchiveUpdates')+'<h3>Update history</h3>'+ARCHIVE_HISTORY.map((entry,i)=>'<article><strong>'+esc(entry.version)+'</strong> <span class="muted">'+esc(entry.date)+(i===0?' · Current':'')+'</span><p>'+esc(entry.description)+'</p></article>').join('')+'</section>';
 // Keep the original workspace mounted but hidden, so restoring it does not
 // destroy active editing state or its event handlers.
 const holder=document.createElement('div');holder.id='archiveUpdatesScreen';holder.innerHTML=content;
 Array.from(wrap.children).forEach(child=>{child.hidden=true;child.style.display='none'});
 wrap.append(holder);
 holder.querySelector('#closeArchiveUpdates').onclick=()=>{
  holder.remove();
  Array.from(wrap.children).forEach(child=>{child.hidden=false;child.style.removeProperty('display')});
  root.className=previousClasses;
  scheduleScrollLayout();
 };
 root.scrollTop=0;scheduleScrollLayout();
}
async function render(){if(!user)return auth();if(!project)return projectList();return workspace()}
function auth(){frame('<div class="panel auth"><h2>Enter the Archive</h2><p class="muted">Sign in or create an account. Email confirmation may be required.</p><form id="authForm"><label>Email</label><input id="email" type="email" autocomplete="email" required><label>Password</label><input id="password" type="password" minlength="6" autocomplete="current-password" required><div class="actions" style="margin-top:18px">'+button('Sign in','login','gold')+button('Create account','signup')+'</div></form></div>');const submit=async(signup)=>{const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value;if(!email||!password)return msg('Enter an email and password');msg('Contacting Supabase…');try{const {data,error:e}=signup?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email,password});if(e)throw e;if(data.session){user=data.user;render()}else msg('Check your email for a confirmation link, then sign in.')}catch(e){error(e)}};document.getElementById('authForm').onsubmit=e=>{e.preventDefault();submit(false)};document.getElementById('signup').onclick=e=>{e.preventDefault();submit(true)}}
async function projectList(){frame('<div class="panel"><h2>Your Realms</h2><p class="muted">Projects are private to their owner and authorized members.</p><div id="projects">Loading…</div><div class="actions" style="margin-top:15px"><input id="newProject" placeholder="Name your new realm" style="max-width:350px">'+button('Create realm','createProject','gold')+'</div><hr style="border-color:#444"><h2>Join a realm</h2><p class="muted">Paste a one-time invitation code from a collaborator.</p><div class="actions"><input id="inviteCode" placeholder="Invitation code" style="max-width:370px">'+button('Join realm','joinRealm','gold')+'</div></div>');document.getElementById('joinRealm').onclick=async()=>{const code=document.getElementById('inviteCode').value.trim();if(!code)return msg('Enter your invitation code');const {error:e}=await client.rpc('archive_redeem_invite',{p_token:code});if(e)return error(e);msg('Welcome to the realm!');await projectList()};const {data,error:e}=await client.from('projects').select('id,name,description,owner_id').order('created_at',{ascending:false});if(e)return error(e);projects=data||[];document.getElementById('projects').innerHTML=projects.length?projects.map(p=>'<button class="item" data-project="'+esc(p.id)+'">'+esc(p.name)+'</button>').join(''):'<p class="muted">No realms yet. Create your first one below.</p>';document.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>{project=projects.find(p=>p.id===b.dataset.project);active=null;workspace()});document.getElementById('createProject').onclick=async()=>{const name=document.getElementById('newProject').value.trim();if(!name)return msg('Enter a realm name');const {data,error:e}=await client.from('projects').insert({name,owner_id:user.id}).select().single();if(e)return error(e);project=data;workspace()}}
const configs={chapters:{table:'chapters',title:'title',fields:[['title','Chapter title'],['body','Manuscript']]},characters:{type:'character',fields:[['name','Name'],['category','Role / title'],['description','Background'],['personality','Personality'],['motivation','Motivations'],['relationships','Relationships'],['notes','Notes']]},locations:{type:'location',fields:[['name','Name'],['category','Region'],['description','Description'],['history','History'],['connections','Connections'],['notes','Notes']]},factions:{type:'faction',fields:[['name','Faction name'],['category','Faction type'],['description','Overview'],['history','History'],['leadership','Leadership'],['goals','Goals and beliefs'],['headquarters','Headquarters'],['notes','Notes']]},lore:{type:'lore',fields:[['name','Name'],['category','Category'],['summary','Summary'],['details','Lore'],['connections','Connections'],['notes','Notes']]}};

const worldSections=['characters','factions','locations','lore'];

let wikiIndex=[],wikiRealm=null;
const wikiSection=t=>({character:'characters',faction:'factions',location:'locations',lore:'lore'})[t];
async function loadWikiIndex(){
 if(!project)return;
 const id=project.id;
 const {data,error:e}=await client.from('archive_entries').select('id,name,entry_type,category,fields').eq('project_id',id).order('name');
 if(e){msg('Search unavailable: '+e.message);return}
 if(project?.id===id){wikiIndex=data||[];wikiRealm=id}
}
function wikiMarkup(value){
 const raw=String(value||''),re=/\[\[([^\]\n]{1,180})\]\]/g;
 let result='',last=0,m;
 while((m=re.exec(raw))){
  result+=esc(raw.slice(last,m.index));
  const parts=m[1].split('|'),key=parts[0].trim(),label=(parts[1]||key).trim();
  const entry=wikiIndex.find(e=>e.id===key)||wikiIndex.find(e=>e.name.toLowerCase()===key.toLowerCase());
  result+=entry&&wikiSection(entry.entry_type)?'<button type="button" class="wiki-link" data-wiki-id="'+esc(entry.id)+'" data-wiki-type="'+esc(entry.entry_type)+'" data-reference-target="'+esc(entry.id)+'">'+esc(label)+'</button>':'<span class="wiki-missing">'+esc(label)+'</span>';
  last=re.lastIndex;
 }
 return result+esc(raw.slice(last));
}
let wikiOpenEpoch=0;
async function openWiki(id,type){
 const epoch=++wikiOpenEpoch,realm=project?.id;
 if(document.getElementById('editStatus')?.textContent==='Unsaved changes…'){msg('Wait for autosave');return}
 try{
  const {data,error:e}=await client.from('archive_entries').select('*').eq('project_id',realm).eq('id',id).single();
  if(epoch!==wikiOpenEpoch||project?.id!==realm)return;
  if(e||!data){msg('Link lookup failed: '+(e?.message||'entry not found'));return}
  const dest=wikiSection(data.entry_type);
  if(!dest){msg('Unknown destination type: '+data.entry_type);return}
  msg('Entry found. Opening '+data.name+'…');
  clearTimeout(timer);worldEditing=false;chapterEditing=false;section=dest;active=data.id;
  await workspace();
  if(epoch!==wikiOpenEpoch||project?.id!==realm||section!==dest)return;
  const target=records.find(x=>x.id===data.id);
  if(!target){msg('Entry fetched, but missing from '+dest+' list');return}
  active=target.id;drawEditor();root.scrollTop=0;scheduleScrollLayout();
 }catch(e){msg('Navigation error: '+(e?.message||String(e)))}
}
function bindWiki(host){
 host.querySelectorAll('[data-wiki-id]').forEach(b=>b.onclick=e=>{
  e.preventDefault();e.stopPropagation();openWiki(b.dataset.wikiId,b.dataset.wikiType);
 });
}

function detectLinkCandidates(value,entries){
 const raw=String(value||''), protectedRanges=[];
 const linkPattern=/\[\[[^\]\n]*\]\]/g;let m;
 while((m=linkPattern.exec(raw)))protectedRanges.push([m.index,linkPattern.lastIndex]);
 const byName=new Map();
 for(const e of entries){
  const name=String(e.name||'').trim();
  if(name.length<3||!wikiSection(e.entry_type))continue;
  const key=name.toLocaleLowerCase();
  if(!byName.has(key))byName.set(key,[]);
  byName.get(key).push(e);
 }
 const names=[...byName.keys()].sort((a,b)=>b.length-a.length);
 const candidates=[];
 for(let i=0;i<raw.length;){
  const protectedAt=protectedRanges.find(([start,end])=>i>=start&&i<end);
  if(protectedAt){i=protectedAt[1];continue}
  let match=null;
  for(const key of names){
   if(raw.slice(i,i+key.length).toLocaleLowerCase()!==key)continue;
   const end=i+key.length;
   if(protectedRanges.some(([start,stop])=>i<stop&&end>start))continue;
   const before=raw[i-1]||'',after=raw[end]||'';
   if(/[\p{L}\p{N}_]/u.test(before)||/[\p{L}\p{N}_]/u.test(after))continue;
   match={start:i,end,label:raw.slice(i,end),options:byName.get(key)};
   break;
  }
  if(match){candidates.push(match);i=match.end}else i++;
 }
 return candidates;
}
async function showDetectLinks(){
 const editor=document.getElementById('editor');if(!editor)return;
 const existing=document.getElementById('detectLinksPanel');if(existing){existing.remove();return}
 const fields=[...editor.querySelectorAll('textarea[data-edit]')];
 if(!fields.length){msg('No text fields available for link detection.');return}
 const panel=document.createElement('section');panel.id='detectLinksPanel';
 panel.style.cssText='border:1px solid #746b50;border-radius:8px;padding:12px;margin:12px 0;background:#22291f';
 panel.innerHTML='<h3>Detect entry links</h3><p class="muted">Review matches before converting them to permanent-ID links. Existing links are left alone.</p><div id="detectLinksResults">Scanning…</div><div class="actions" style="margin-top:12px">'+button('Apply selected links','detectLinksApply','gold')+button('Cancel','detectLinksCancel')+'</div>';
 const insertButton=editor.querySelector('#detectWikiLinks');
 editor.insertBefore(panel,insertButton?.parentElement?.nextSibling||editor.firstChild);
 panel.querySelector('#detectLinksCancel').onclick=()=>panel.remove();
 const realm=project?.id,entry=active;
 await loadWikiIndex();
 if(!panel.isConnected||project?.id!==realm||active!==entry)return;
 const candidates=[];
 for(const field of fields){
  for(const match of detectLinkCandidates(field.value,wikiIndex)){
   if(match.options.every(x=>x.id===entry))continue;
   candidates.push({...match,field,original:field.value,options:match.options.filter(x=>x.id!==entry)});
  }
 }
 const results=panel.querySelector('#detectLinksResults');
 if(!candidates.length){
  results.innerHTML='<p class="muted">No unlinked entry names found in text fields.</p>';
  panel.querySelector('#detectLinksApply').disabled=true;return;
 }
 results.innerHTML='<p class="muted">'+candidates.length+' possible mention(s) found. Ambiguous names require choosing an entry.</p>'+candidates.map((c,i)=>{
  const excerpt=c.original.slice(Math.max(0,c.start-35),Math.min(c.original.length,c.end+35)).replace(/\s+/g,' ');
  return '<div style="border-bottom:1px solid #41483b;padding:9px 0"><label style="display:flex;gap:9px;align-items:center"><input type="checkbox" data-detect-check="'+i+'" '+(c.options.length===1?'checked':'')+'><span><strong>'+esc(c.label)+'</strong> <small class="muted">in '+esc(c.field.dataset.edit)+'</small></span></label><p class="muted">'+esc(excerpt)+'</p>'+(c.options.length>1?'<select data-detect-choice="'+i+'"><option value="">Choose matching entry…</option>'+c.options.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' ('+esc(x.entry_type)+')</option>').join('')+'</select>':'')+'</div>';
 }).join('');
 panel.querySelector('#detectLinksApply').onclick=()=>{
  // Prevent stale offsets from modifying a draft edited while the review was open.
  if(fields.some(field=>candidates.some(c=>c.field===field&&c.original!==field.value))){
   msg('Text changed during review. Run Detect Links again.');panel.remove();return;
  }
  const selected=[];
  for(let i=0;i<candidates.length;i++){
   const check=panel.querySelector('[data-detect-check="'+i+'"]');
   if(!check?.checked)continue;
   const c=candidates[i],choice=panel.querySelector('[data-detect-choice="'+i+'"]');
   const chosen=choice?c.options.find(x=>x.id===choice.value):c.options[0];
   if(!chosen){msg('Choose an entry for each checked ambiguous name.');return}
   selected.push({...c,chosen});
  }
  if(!selected.length){msg('Select at least one mention.');return}
  const affected=new Set(selected.map(c=>c.field));
  for(const field of affected){
   const changes=selected.filter(c=>c.field===field).sort((a,b)=>b.start-a.start);
   let value=field.value;
   for(const c of changes)value=value.slice(0,c.start)+'[['+c.chosen.id+'|'+c.label+']]'+value.slice(c.end);
   field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));
  }
  panel.remove();msg('Inserted '+selected.length+' permanent link(s). Autosaving…');
 };
}

function showWikiPicker(){
 const editor=document.getElementById('editor');
 if(!editor)return;
 const fields=[...editor.querySelectorAll('textarea[data-edit],input[data-edit]')];
 if(!fields.length)return;
 let field=fields.find(x=>x===document.activeElement)||fields.find(x=>x.dataset.edit==='body'||x.dataset.edit==='description'||x.dataset.edit==='details'||x.dataset.edit==='notes')||fields[0];
 const existing=document.getElementById('wikiPicker');if(existing){existing.remove();return}
 const panel=document.createElement('div');panel.id='wikiPicker';
 panel.style.cssText='border:1px solid #746b50;border-radius:8px;padding:12px;margin:12px 0;background:#22291f';
 panel.innerHTML='<label for="wikiPickerField">Insert into field</label><select id="wikiPickerField">'+fields.map(x=>'<option value="'+esc(x.dataset.edit)+'" '+(x===field?'selected':'')+'>'+esc(x.dataset.edit)+'</option>').join('')+'</select><label for="wikiPickerQuery">Find an entry</label><input id="wikiPickerQuery" type="search" placeholder="Search names…"><div id="wikiPickerResults"></div>'+button('Cancel','wikiPickerCancel');
 editor.insertBefore(panel,editor.querySelector('[data-edit]')?.previousElementSibling||editor.firstChild);
 panel.querySelector('#wikiPickerCancel').onclick=()=>panel.remove();
 const input=panel.querySelector('#wikiPickerQuery'),results=panel.querySelector('#wikiPickerResults');
 const draw=()=>{
  const q=input.value.trim().toLowerCase();
  const matches=wikiIndex.filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,25);
  results.innerHTML=matches.map(x=>'<button type="button" class="btn" style="display:block;width:100%;text-align:left;margin:5px 0" data-pick-id="'+esc(x.id)+'">'+esc(x.name)+' <small>('+esc(x.entry_type)+')</small></button>').join('')||'<p class="muted">No matches</p>';
  results.querySelectorAll('[data-pick-id]').forEach(b=>b.onclick=()=>{
   const entry=wikiIndex.find(x=>x.id===b.dataset.pickId);
   const target=fields.find(x=>x.dataset.edit===panel.querySelector('#wikiPickerField').value);
   if(!entry||!target)return;
   const ref='[['+entry.id+'|'+entry.name+']]';
   const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;
   target.value=target.value.slice(0,start)+ref+target.value.slice(end);
   target.dispatchEvent(new Event('input',{bubbles:true}));
   target.focus();target.setSelectionRange(start+ref.length,start+ref.length);
   panel.remove();
  });
 };
 input.oninput=draw;
 loadWikiIndex().then(()=>{if(panel.isConnected)draw()});
 draw();input.focus();
}
function showWikiResults(q){
 const host=document.getElementById('wikiResults');if(!host)return;
 q=q.trim().toLowerCase();
 if(!q){host.innerHTML='<p class="muted">Search names, descriptions and notes throughout this realm.</p>';return}
 const matches=wikiIndex.filter(e=>[e.name,e.category,e.description,...Object.values(e.fields||{}).map(v=>typeof v==='string'?v:'')].join(' ').toLowerCase().includes(q)).slice(0,50);
 host.innerHTML=matches.length?matches.map(e=>'<button type="button" data-result-id="'+esc(e.id)+'" data-result-type="'+esc(e.entry_type)+'">'+esc(e.name)+' <small>('+esc(e.entry_type)+')</small></button>').join(''):'<p class="muted">No matches.</p>';
 host.querySelectorAll('[data-result-id]').forEach(b=>b.onclick=()=>openWiki(b.dataset.resultId,b.dataset.resultType));
}
async function setupWikiSearch(){
 const input=document.getElementById('wikiSearch');if(!input)return;
 input.oninput=()=>showWikiResults(input.value);
 if(wikiRealm!==project.id)wikiIndex=[];
 showWikiResults('');
 await loadWikiIndex();
 if(input.isConnected)showWikiResults(input.value);
}
async function refreshWikiReader(id){
 const realm=project?.id;
 await loadWikiIndex();
 if(project?.id!==realm||active!==id||!root.classList.contains('world-detail')||worldEditing)return;
 const rec=records.find(x=>x.id===id),el=document.getElementById('editor');
 if(rec&&el)drawWorldProfile(rec,el);
}

function navigate(dest){root.classList.remove('focus-mode');if(dest==='world')dest=worldSections.includes(section)?section:'characters';if(dest===section)return;root.classList.remove('world-detail','chapter-detail','chapter-list');worldEditing=false;chapterEditing=false;clearTimeout(timer);stopLive();section=dest;active=null;workspace()}

async function chronicleView(){
 frame(navigationUI()+'<section class="panel"><div class="entry-heading"><h2>The Chronicle</h2>'+button('＋ Event','addEvent','gold')+'</div><p class="muted">One timeline for this realm. Undated events stay at the end.</p><div id="chronicleItems">Loading…</div><div id="chronicleEdit"></div></section>');
 bindNavigation();
 document.getElementById('addEvent').onclick=()=>editChronicle();
 const realm=project.id;
 const [events,entries]=await Promise.all([client.from('chronicle_events').select('*').eq('project_id',realm).order('event_year',{ascending:true,nullsFirst:false}),client.from('archive_entries').select('id,name,entry_type').eq('project_id',realm).order('name')]);
 if(project?.id!==realm||section!=='chronicle')return;
 if(events.error){document.getElementById('chronicleItems').textContent='Timeline unavailable: '+events.error.message;return}
 const list=events.data||[],world=entries.data||[];
 document.getElementById('chronicleItems').innerHTML=list.length?list.map(e=>'<article class="panel" style="margin:10px 0"><button class="btn" data-event="'+esc(e.id)+'"><span class="muted">'+(e.event_year===null?'Undated':(e.approximate?'~ ':'')+esc(e.event_year)+(e.era_label?' '+esc(e.era_label):''))+'</span> · '+esc(e.title)+'</button><p>'+esc(e.description)+'</p>'+((e.related_entry_ids||[]).map(id=>world.find(w=>w.id===id)).filter(Boolean).map(w=>'<button class="wiki-link" data-world="'+esc(w.id)+'" data-type="'+esc(w.entry_type)+'">'+esc(w.name)+'</button>').join(' '))+'</article>').join(''):'<p class="muted">No events yet. Add your first milestone.</p>';
 document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>editChronicle(list.find(e=>e.id===b.dataset.event),world));
 document.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>openWiki(b.dataset.world,b.dataset.type));
 async function editChronicle(e,known=world){
  const host=document.getElementById('chronicleEdit');
  host.innerHTML='<div class="panel"><h3>'+(e?'Edit':'New')+' Event</h3><label>Title</label><input id="ceTitle" value="'+esc(e?.title||'')+'"><label>Year (blank if unknown)</label><input id="ceYear" type="number" step="1" value="'+(e?.event_year??'')+'"><label>Era (optional)</label><input id="ceEra" value="'+esc(e?.era_label||'')+'"><label><input id="ceApprox" type="checkbox" '+(e?.approximate?'checked':'')+'> Approximate</label><label>Description</label><textarea id="ceDesc">'+esc(e?.description||'')+'</textarea><h4>Related World entries</h4>'+known.map(w=>'<label><input type="checkbox" data-ce-link="'+esc(w.id)+'" '+((e?.related_entry_ids||[]).includes(w.id)?'checked':'')+'> '+esc(w.name)+'</label>').join('')+'<div class="actions">'+button('Save','ceSave','gold')+button('Cancel','ceCancel')+(e?button('Delete','ceDelete'):'')+'</div></div>';
  document.getElementById('ceCancel').onclick=()=>host.innerHTML='';
  document.getElementById('ceSave').onclick=async()=>{
   const title=document.getElementById('ceTitle').value.trim(),year=document.getElementById('ceYear').value;
   if(!title||title.length>200){msg('Enter an event title (up to 200 characters).');return}
   const payload={project_id:project.id,title,event_year:year===''?null:Number(year),approximate:document.getElementById('ceApprox').checked,era_label:document.getElementById('ceEra').value,description:document.getElementById('ceDesc').value,related_entry_ids:[...host.querySelectorAll('[data-ce-link]:checked')].map(b=>b.dataset.ceLink)};
   const btn=document.getElementById('ceSave');btn.disabled=true;
   const {error:err}=await(e?client.from('chronicle_events').update(payload).eq('project_id',project.id).eq('id',e.id):client.from('chronicle_events').insert(payload));
   if(err){btn.disabled=false;msg(err.message);return}await chronicleView();
  };
  if(e)document.getElementById('ceDelete').onclick=async()=>{if(!confirm('Delete this event?'))return;const {error:err}=await client.from('chronicle_events').delete().eq('project_id',project.id).eq('id',e.id);if(err)return error(err);await chronicleView()};
 }
 scheduleScrollLayout();
}

function navigationUI(){
 const current=section==='chapters'?'chapters':(worldSections.includes(section)||section==='chronicle')?'world':section==='board'?'board':'';
 const items=[['chapters','▤','Manuscript'],['world','♜','World'],['board','☷','Council']];
 const links=items.map(([id,symbol,label])=>'<button type="button" data-destination="'+id+'" '+(current===id?'aria-current="page"':'')+'><span class="nav-symbol" aria-hidden="true">'+symbol+'</span>'+label+'</button>').join('');
 return '<div class="realm-head"><div><div class="muted">CURRENT REALM</div><h2>'+esc(project.name)+'</h2></div>'+button('⇄ Realms','back')+'</div><nav class="primary-nav" aria-label="Main navigation">'+items.map(([id,symbol,label])=>button(symbol+' '+label,'nav_'+id,current===id?'gold':'')).join('')+'</nav><nav class="mobile-nav" aria-label="Main navigation">'+links+'</nav>'+((worldSections.includes(section)||section==='chronicle')?'<div class="world-nav">'+[...worldSections,'chronicle'].map(k=>button(k[0].toUpperCase()+k.slice(1),'world_'+k,section===k?'gold':'')).join('')+'</div><div class="wiki-search"><input type="search" id="wikiSearch" placeholder="⌕ Search this realm" aria-label="Search world entries"><div id="wikiResults"></div></div>':'');
}
function bindNavigation(){
 document.getElementById('back').onclick=()=>{clearTimeout(timer);stopLive();project=null;active=null;projectList()};
 document.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>navigate(b.dataset.destination));
 for(const k of ['chapters','world','board']){const b=document.getElementById('nav_'+k);if(b)b.onclick=()=>navigate(k)}
 for(const k of [...worldSections,'chronicle']){const b=document.getElementById('world_'+k);if(b)b.onclick=()=>navigate(k)}
}

async function workspace(){root.classList.remove('focus-mode','world-detail','world-list','long-world-list','chapter-detail','chapter-list','long-chapter-list');stopLive();if(section==='profile')return profileView();if(section==='board')return boardView();if(section==='chronicle')return chronicleView();if(section==='members')return membersView();if(section==='settings')return realmSettings();frame(navigationUI()+'<div class="grid"><aside class="panel"><div class="entry-heading"><h3>'+({chapters:'Chapters',characters:'Characters',factions:'Factions',locations:'Locations',lore:'Lore'}[section])+'</h3><div class="actions">'+button('＋ New','newEntry','gold')+button('▾','toggleEntries')+'</div></div><div id="entries" class="entry-list" style="margin-top:12px">Loading…</div></aside><div class="panel" id="editor">Choose an entry or create one.</div></div>');bindNavigation();if(worldSections.includes(section))setupWikiSearch();else if(section==='chapters')loadWikiIndex().then(()=>{if(section==='chapters'&&active&&!chapterEditing){const rec=records.find(x=>x.id===active),el=document.getElementById('editor');if(rec&&el)drawChapterReader(rec,el)}});document.getElementById('toggleEntries').onclick=()=>{const el=document.getElementById('entries');el.classList.toggle('collapsed');document.getElementById('toggleEntries').textContent=el.classList.contains('collapsed')?'▸':'▾'};document.getElementById('newEntry').onclick=()=>createEntry();await loadEntries()}
async function loadEntries(){const cfg=configs[section];let q=client.from(cfg.table||'archive_entries').select('*').eq('project_id',project.id);if(cfg.type)q=q.eq('entry_type',cfg.type);let {data,error:e}=await q.order(section==='chapters'?'chapter_order':'updated_at',{ascending:section==='chapters'});if(e&&section==='chapters'&&(/chapter_order|does not exist|schema cache/i).test(e.message||'')){({data,error:e}=await client.from('chapters').select('*').eq('project_id',project.id).order('id',{ascending:true}));}if(e)return error(e);records=data||[];const list=document.getElementById('entries');if(!list)return;if(section==='characters'){
 const {data:factions,error:fe}=await client.from('archive_entries').select('id,name').eq('project_id',project.id).eq('entry_type','faction').order('name');
 if(fe)return error(fe);
 const groups=[...(factions||[]).map(f=>({id:f.id,name:f.name,people:records.filter(r=>(r.fields?.faction_ids||[]).includes(f.id))})),{id:'none',name:'Unaffiliated',people:records.filter(r=>!(r.fields?.faction_ids||[]).length)}];
 const item=r=>'<button class="item '+(active===r.id?'on':'')+'" data-entry="'+esc(r.id)+'">'+esc(r.name)+'</button>';
 list.innerHTML=groups.filter(g=>g.people.length||g.id==='none').map(g=>'<details class="faction-group" open><summary>'+esc(g.name)+' ('+g.people.length+')</summary><div class="group-items">'+(g.people.map(item).join('')||'<p class="muted">No members yet.</p>')+'</div></details>').join('');
 }else list.innerHTML=records.map(r=>'<button class="item '+(active===r.id?'on':'')+'" data-entry="'+esc(r.id)+'">'+esc(r.title||r.name)+'</button>').join('')||'<p class="muted">Nothing here yet.</p>';list.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>{active=b.dataset.entry;worldEditing=false;chapterEditing=false;drawEditor();if(section==='chapters')root.scrollTop=0;if(section==='chapters'){list.classList.remove('collapsed');const toggle=document.getElementById('toggleEntries');if(toggle)toggle.textContent='▾'}});if(!records.some(r=>r.id===active))active=null;drawEditor();updateChapterListSpacing();updateWorldListSpacing()}

// World relationships are stored separately from entry notes so they are reciprocal and navigable.
let worldLinkEpoch=0;
async function renderWorldLinks(entryId){
 const host=document.getElementById('worldLinks');if(!host)return;
 const epoch=++worldLinkEpoch;
 const [{data:entries,error:entriesError},{data:links,error:linksError}]=await Promise.all([
  client.from('archive_entries').select('id,name,entry_type').eq('project_id',project.id).order('name'),
  client.from('archive_links').select('id,source_id,target_id,relationship').eq('project_id',project.id).or('source_id.eq.'+entryId+',target_id.eq.'+entryId).order('created_at',{ascending:true})
 ]);
 if(epoch!==worldLinkEpoch||active!==entryId||!document.getElementById('worldLinks'))return;
 if(entriesError)return host.textContent='Could not load archive entries: '+entriesError.message;
 if(linksError){host.innerHTML='<p class="muted">Connections require the v0.8 Supabase migration. '+esc(linksError.message)+'</p>';return}
 const lookup=new Map((entries||[]).map(e=>[e.id,e]));
 const list=(links||[]).map(l=>{
  const other=l.source_id===entryId?l.target_id:l.source_id;
  const item=lookup.get(other);
  if(!item)return '';
  const direction=l.source_id===entryId?'→':'←';
  return '<div class="link-card"><button type="button" class="btn" data-follow-link="'+esc(other)+'" data-follow-type="'+esc(item.entry_type)+'">'+esc(item.name)+'</button><span class="link-label">'+direction+' '+esc(l.relationship)+'</span><button type="button" class="btn" data-remove-link="'+esc(l.id)+'" aria-label="Remove connection">✕</button></div>';
 }).join('');
 const options=(entries||[]).filter(e=>e.id!==entryId).map(e=>'<option value="'+esc(e.id)+'">'+esc(e.name)+' ('+esc(e.entry_type)+')</option>').join('');
 host.innerHTML='<h3>Connections</h3><p class="muted">Link people, places, and lore across this realm. Arrows show which entry the relationship describes.</p>'+ (list||'<p class="muted">No connections yet.</p>')+(options?'<div class="link-create"><select id="linkTarget" aria-label="Entry to link">'+options+'</select><input id="linkRelation" maxlength="80" placeholder="Relationship (e.g. sibling of)" aria-label="Relationship">'+button('＋ Add connection','addWorldLink','gold')+'</div>':'<p class="muted">Create another world entry to start linking.</p>');
 host.querySelectorAll('[data-follow-link]').forEach(b=>b.onclick=()=>{clearTimeout(timer);const pending=document.getElementById('editStatus')?.textContent;if(pending==='Unsaved changes…'){msg('Wait for autosave before opening another entry');return}const type=b.dataset.followType;if(!worldSections.includes(type+'s')&&type!=='lore')return;section=type==='lore'?'lore':type+'s';active=b.dataset.followLink;workspace()});
 host.querySelectorAll('[data-remove-link]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this connection?'))return;const {error:e}=await client.from('archive_links').delete().eq('id',b.dataset.removeLink).eq('project_id',project.id);if(e)return error(e);renderWorldLinks(entryId)});
 const add=document.getElementById('addWorldLink');if(add)add.onclick=async()=>{
  const target=document.getElementById('linkTarget').value,relationship=document.getElementById('linkRelation').value.trim();
  if(!relationship)return msg('Enter a relationship label');
  add.disabled=true;
  const {error:e}=await client.from('archive_links').insert({project_id:project.id,source_id:entryId,target_id:target,relationship});
  if(e){add.disabled=false;return error(e)}renderWorldLinks(entryId);
 };
}


async function renderFactionMembership(id,readOnly=false){
 const host=document.getElementById('factionMembership');if(!host)return;
 const {data,error:e}=await client.from('archive_entries').select('id,name').eq('project_id',project.id).eq('entry_type','faction').order('name');
 if(!host.isConnected||active!==id)return;
 if(e){host.textContent='Could not load factions: '+e.message;return}
 const r=records.find(x=>x.id===id);if(!r)return;
 const selected=r.fields?.faction_ids||[];
 if(readOnly){const names=(data||[]).filter(f=>selected.includes(f.id)).map(f=>esc(f.name));host.innerHTML='<h3>Factions & groups</h3><p>'+(names.length?names.join(' · '):'<span class="muted">Unaffiliated</span>')+'</p>';return}
 host.innerHTML='<h3>Factions & groups</h3><p class="muted">A character can belong to multiple factions. Create or edit factions under World → Factions.</p>'+((data||[]).map(f=>'<label><input type="checkbox" data-faction="'+esc(f.id)+'" '+(selected.includes(f.id)?'checked':'')+'>'+esc(f.name)+'</label>').join('')||'<p class="muted">No factions yet. Open the Factions tab to create one.</p>');
 host.querySelectorAll('[data-faction]').forEach(box=>box.onchange=async()=>{
  const ids=[...host.querySelectorAll('[data-faction]:checked')].map(x=>x.dataset.faction);
  const updated={...(r.fields||{}),faction_ids:ids};
  if(document.getElementById('editStatus')?.textContent==='Unsaved changes…'){box.checked=!box.checked;msg('Wait for your notes to autosave, then change faction membership');return}
  box.disabled=true;
  const {error:saveError}=await client.from('archive_entries').update({fields:updated}).eq('id',id).eq('project_id',project.id);
  box.disabled=false;
  if(saveError){box.checked=!box.checked;return error(saveError)}
  r.fields=updated;msg('Faction membership saved. Reopen Characters to see updated groups.');
 });
}


function exitWorldProfile(){
 if(document.getElementById('editStatus')?.textContent==='Unsaved changes…'){msg('Wait for autosave before leaving');return}
 clearTimeout(timer);worldEditing=false;active=null;
 const editor=document.getElementById('editor');if(editor)editor.innerHTML='<p class="muted">Choose an entry or create one.</p>';
 root.classList.remove('world-detail');root.classList.add('world-list');
 document.getElementById('entries')?.scrollIntoView({block:'start'});updateWorldListSpacing();
}
async function finishWorldEdit(){
 if(document.getElementById('editStatus')?.textContent==='Unsaved changes…'){msg('Saving changes…');clearTimeout(timer);await saveEntry(active);if(document.getElementById('editStatus')?.textContent?.startsWith('Save failed'))return}
 worldEditing=false;drawEditor();
}

let referenceEpoch=0;
function chapterMentions(body,entryId){
 const matches=[],raw=String(body||''),re=/\[\[([^\]\n]{1,180})\]\]/g;let m;
 while((m=re.exec(raw))){
  const parts=m[1].split('|'),key=parts[0].trim();
  if(key!==entryId)continue;
  const start=Math.max(0,m.index-75),end=Math.min(raw.length,re.lastIndex+75);
  const snippet=raw.slice(start,end).replace(/\[\[([^\]\n]+)\]\]/g,(_,inner)=>inner.split('|').slice(-1)[0]).replace(/\s+/g,' ').trim();
  matches.push({ordinal:matches.length,snippet});
 }
 return matches;
}
async function renderReferences(entryId){
 const host=document.getElementById('worldReferences');if(!host)return;
 const epoch=++referenceEpoch,realm=project?.id;
 const {data,error:e}=await client.from('chapters').select('id,title,body').eq('project_id',realm).order('chapter_order',{ascending:true});
 if(epoch!==referenceEpoch||realm!==project?.id||active!==entryId||!host.isConnected)return;
 if(e){host.innerHTML='<h3>Referenced In</h3><p class="muted">Could not load chapter references: '+esc(e.message)+'</p>';return}
 const refs=[];
 for(const chapter of data||[])for(const mention of chapterMentions(chapter.body,entryId))refs.push({...mention,chapterId:chapter.id,title:chapter.title||'Untitled Chapter'});
 host.innerHTML='<h3>Referenced In <small class="muted">('+refs.length+')</small></h3>'+(refs.length?refs.map((ref,i)=>'<button type="button" class="btn" data-reference="'+i+'" style="display:block;width:100%;text-align:left;margin:8px 0"><strong>'+esc(ref.title)+'</strong><span class="muted" style="display:block;margin-top:5px">'+esc(ref.snippet)+'</span></button>').join(''):'<p class="muted">No linked mentions in manuscript chapters yet.</p>');
 host.querySelectorAll('[data-reference]').forEach(button=>button.onclick=()=>openChapterReference(refs[Number(button.dataset.reference)],entryId));
 scheduleScrollLayout();
}
async function openChapterReference(ref,entryId){
 const realm=project?.id;
 try{
  const {data,error:e}=await client.from('chapters').select('*').eq('project_id',realm).eq('id',ref.chapterId).single();
  if(e||!data||project?.id!==realm){msg('Could not open reference: '+(e?.message||'chapter missing'));return}
  clearTimeout(timer);worldEditing=false;chapterEditing=false;section='chapters';active=data.id;
  await workspace();
  if(project?.id!==realm||section!=='chapters')return;
  active=data.id;drawEditor();
  const mentions=[...document.querySelectorAll('#editor .chapter-prose [data-reference-target]')].filter(el=>el.dataset.referenceTarget===entryId);
  const target=mentions[ref.ordinal];
  if(!target){msg('Chapter opened, but this mention has changed.');return}
  target.style.cssText='background:#b39560;color:#141713;border-radius:4px;outline:3px solid #b39560';
  target.scrollIntoView({block:'center',behavior:'smooth'});
  scheduleScrollLayout();
 }catch(e){msg('Reference navigation failed: '+(e?.message||String(e)))}
}

function drawWorldProfile(r,el){
 const cfg=configs[section],vals={...r,...(r.fields||{})};
 root.classList.add('world-detail');
 const fields=cfg.fields.filter(([key])=>key!=='name').map(([key,label])=>{
  const value=String(vals[key]||'').trim();
  return value?'<section class="world-read-section"><h3>'+esc(label)+'</h3><p>'+wikiMarkup(value).replace(/\\n/g,'<br>')+'</p></section>':'';
 }).join('');
 el.innerHTML='<div class="world-profile-bar">'+button('← Back','worldBack')+button('✎ Edit','worldEdit','gold')+'</div><h2 class="world-profile-title">'+esc(r.name)+'</h2>'+(fields||'<p class="muted">No details yet. Tap Edit to add some.</p>')+(section==='characters'?'<section id="factionMembership" class="faction-membership"><p class="muted">Loading factions…</p></section>':'')+'<section class="link-section" id="worldReferences"><h3>Referenced In</h3><p class="muted">Loading manuscript references…</p></section><section class="link-section" id="worldLinks"><p class="muted">Loading connections…</p></section>';
 bindWiki(el);
 document.getElementById('worldBack').onclick=exitWorldProfile;
 document.getElementById('worldEdit').onclick=()=>{worldEditing=true;drawEditor()};
 if(section==='characters')renderFactionMembership(r.id,true);
 renderWorldLinks(r.id);
 renderReferences(r.id);
 if(wikiRealm!==project?.id)refreshWikiReader(r.id);
}


function updateWorldListSpacing(){scheduleScrollLayout()}
function updateChapterListSpacing(){scheduleScrollLayout()}
let scrollLayoutPending=false;
function scheduleScrollLayout(){
 if(scrollLayoutPending)return;
 scrollLayoutPending=true;
 requestAnimationFrame(()=>{
  scrollLayoutPending=false;
  const visible=root.style.display!=='none';
  document.documentElement.classList.toggle('archive-open',visible);
  if(!visible){root.classList.remove('scroll-locked');return}
  const wrap=root.querySelector('.wrap'),nav=root.querySelector('.mobile-nav');
  root.classList.remove('needs-nav-clearance','scroll-locked');
  if(!wrap){updateScrollDiagnostics();return}
  if(!root.classList.contains('focus-mode')&&nav&&getComputedStyle(nav).display!=='none'){
   const navHeight=nav.getBoundingClientRect().height;
   const contentBottom=wrap.getBoundingClientRect().bottom-root.getBoundingClientRect().top+root.scrollTop;
   if(contentBottom>root.clientHeight-navHeight+1)root.classList.add('needs-nav-clearance');
  }
  // Safari can animate a scroll indicator on a nominally scrollable
  // fixed overlay. Disable that scroll surface when it has no scroll range.
  if(!root.classList.contains('focus-mode')&&root.scrollHeight<=root.clientHeight+1){
   root.scrollTop=0;
   root.classList.add('scroll-locked');
  }
  updateScrollDiagnostics();
 });
}
const scrollLayoutObserver=new MutationObserver(scheduleScrollLayout);
scrollLayoutObserver.observe(root,{childList:true,subtree:true});
window.addEventListener('resize',scheduleScrollLayout);
window.visualViewport?.addEventListener('resize',scheduleScrollLayout);
const scrollSizeObserver=new ResizeObserver(scheduleScrollLayout);
scrollSizeObserver.observe(root);
// Optional on-device diagnostics: append &scrollDebug=1 to the page URL.
// This displays measured overflow without exposing any manuscript content.
let scrollDebugPanel=null;
function updateScrollDiagnostics(){
 if(!new URLSearchParams(location.search).has('scrollDebug'))return;
 if(!scrollDebugPanel){
  scrollDebugPanel=document.createElement('div');
  scrollDebugPanel.style.cssText='position:fixed;z-index:10000;top:4px;right:4px;background:#111e;color:#f5d69b;border:1px solid #b39560;padding:5px;font:10px monospace;pointer-events:none;white-space:pre';
  document.body.append(scrollDebugPanel);
 }
 const wrap=root.querySelector('.wrap');
 scrollDebugPanel.textContent='cloud scroll '+root.scrollTop.toFixed(0)+' / '+Math.max(0,root.scrollHeight-root.clientHeight).toFixed(0)+'px\\nbody scroll '+(window.scrollY||0).toFixed(0)+' / '+Math.max(0,document.documentElement.scrollHeight-window.innerHeight).toFixed(0)+'px\\nwrap '+(wrap?.getBoundingClientRect().height.toFixed(0)||'-')+' / viewport '+root.clientHeight+'\\nnav clearance '+root.classList.contains('needs-nav-clearance');
}
root.addEventListener('scroll',updateScrollDiagnostics,{passive:true});
window.addEventListener('scroll',updateScrollDiagnostics,{passive:true});
function exitChapter(){
 if(document.getElementById('editStatus')?.textContent==='Unsaved changes…'){msg('Wait for autosave before leaving');return}
 root.classList.remove('focus-mode','chapter-detail');root.classList.add('chapter-list');chapterEditing=false;active=null;clearTimeout(timer);stopLive();
 const editor=document.getElementById('editor');if(editor)editor.innerHTML='<p class="muted">Choose a chapter or create one.</p>';
 root.scrollTop=0;
}
async function finishChapterEdit(){
 if(root.classList.contains('focus-mode'))root.classList.remove('focus-mode');
 const status=document.getElementById('editStatus');
 if(status?.textContent==='Unsaved changes…'){clearTimeout(timer);await saveEntry(active)}
 if(status?.textContent?.startsWith('Save failed')||status?.textContent?.startsWith('Conflict')||status?.textContent==='Saving newer changes…'){msg('Resolve pending chapter changes before leaving Edit mode');return}
 chapterEditing=false;drawEditor();
}
function drawChapterReader(r,el){
 root.classList.add('chapter-detail');
 const body=wikiMarkup(r.body||'');
 el.innerHTML='<div class="world-profile-bar">'+button('← Back','chapterBack')+button('✎ Edit','chapterEdit','gold')+'</div><article class="chapter-reader"><h1>'+esc(r.title||'Untitled Chapter')+'</h1><div class="chapter-prose">'+(body||'<p class="muted">This chapter is empty. Tap Edit to begin writing.</p>')+'</div></article>';
 bindWiki(el);
 document.getElementById('chapterBack').onclick=exitChapter;
 document.getElementById('chapterEdit').onclick=()=>{chapterEditing=true;drawEditor()};
}

let worldEditing=false,chapterEditing=false;
function drawEditor(){stopLive();const r=records.find(x=>x.id===active),el=document.getElementById('editor');root.classList.toggle('world-detail',worldSections.includes(section)&&!!r);root.classList.toggle('world-list',worldSections.includes(section)&&!r);root.classList.toggle('chapter-detail',section==='chapters'&&!!r);root.classList.toggle('chapter-list',section==='chapters'&&!r);root.classList.toggle('chapter-list',section==='chapters'&&!r);if(!el)return;if(!r){el.innerHTML=section==='chapters'?'':'<p class="muted">Create an entry to begin.</p>';return}if(section==='chapters'&&!chapterEditing){drawChapterReader(r,el);return}if(section!=='chapters'&&!worldEditing){drawWorldProfile(r,el);return}const cfg=configs[section];const vals={...r,...(r.fields||{})};el.innerHTML=(section!=='chapters'?'<div class="world-profile-bar">'+button('← Back','worldBack')+button('✓ Done','worldDone','gold')+'</div>':'<div class="chapter-edit-bar">'+button('← Back','chapterBack')+button('✓ Done','chapterDone','gold')+'</div>')+'<h2>'+esc(r.title||r.name)+'</h2>'+(section==='chapters'?'<div class="editor-tools">'+button('✒ Focus mode','focusToggle','gold')+'<span class="word-count" id="wordCount"></span></div>':'')+'<p class="muted">Changes save automatically to your private cloud project.</p>'+'<div class="actions">'+button('🔗 Insert entry link','insertWikiLink')+button('⌕ Detect links','detectWikiLinks')+'</div>'+cfg.fields.map(([key,label])=>'<label for="field_'+key+'">'+label+'</label>'+(key==='body'||['description','personality','motivation','relationships','history','connections','notes','summary','details'].includes(key)?'<textarea class="'+(['body','details'].includes(key)?'long':'')+'" data-edit="'+key+'" id="field_'+key+'">'+esc(vals[key])+'</textarea>':'<input data-edit="'+key+'" id="field_'+key+'" value="'+esc(vals[key])+'">')).join('')+(section==='chapters'?'<p class="muted" id="chapterPresence">Checking other writers…</p><div class="actions" style="margin-top:12px">'+button('Revision history','chapterHistory')+button('Refresh chapter','refreshChapter')+'</div><div id="historyPanel"></div>':'')+(section==='characters'?'<section id="factionMembership" class="faction-membership"><p class="muted">Loading factions…</p></section>':'')+(section!=='chapters'?'<section class="link-section" id="worldLinks"><p class="muted">Loading connections…</p></section>':'')+'<div class="actions" style="margin-top:16px">'+button('Delete entry','deleteEntry')+'<span class="status" id="editStatus">Saved in cloud</span></div>';if(section!=='chapters'){document.getElementById('worldBack').onclick=()=>exitWorldProfile();document.getElementById('worldDone').onclick=()=>finishWorldEdit()}else{document.getElementById('chapterBack').onclick=()=>exitChapter();document.getElementById('chapterDone').onclick=()=>finishChapterEdit()}document.getElementById('insertWikiLink').onclick=showWikiPicker;document.getElementById('detectWikiLinks').onclick=showDetectLinks;el.querySelectorAll('[data-edit]').forEach(input=>input.addEventListener('input',()=>{const current=records.find(x=>x.id===active);if(!current)return;const key=input.dataset.edit;const value=input.value;if(section==='chapters'||key==='name'||key==='category')current[key]=value;else current.fields={...(current.fields||{}),[key]:value};document.getElementById('editStatus').textContent='Unsaved changes…';clearTimeout(timer);const id=current.id;timer=setTimeout(()=>saveEntry(id),900)}));if(section==='characters')renderFactionMembership(r.id);if(section!=='chapters')renderWorldLinks(r.id);if(section==='chapters'){const count=()=>{const v=document.getElementById('field_body')?.value||'';const words=v.trim()?v.trim().split(/\s+/u).length:0;const el=document.getElementById('wordCount');if(el)el.textContent=words.toLocaleString()+' words'};count();document.getElementById('field_body').addEventListener('input',count);document.getElementById('focusToggle').onclick=()=>{const on=root.classList.toggle('focus-mode');document.getElementById('focusToggle').textContent=on?'✕ Exit':'✒ Focus mode';if(on)document.getElementById('field_body').focus()};loadWriterNames().then(()=>{updatePresence(r.id);readPresence(r.id);startLive('chapters')});document.getElementById('chapterHistory').onclick=()=>showChapterHistory(r.id);document.getElementById('refreshChapter').onclick=async()=>{if(document.getElementById('editStatus')?.textContent==='Unsaved changes…'&&!confirm('Discard unsaved changes and load the latest version?'))return;clearTimeout(timer);await loadEntries()}}document.getElementById('deleteEntry').onclick=()=>removeEntry(r.id)}
async function saveEntry(id){
 const r=records.find(x=>x.id===id);if(!r)return;
 const status=document.getElementById('editStatus');
 if(section==='chapters'){
  if(saveBusy){clearTimeout(timer);timer=setTimeout(()=>saveEntry(id),800);return}
  saveBusy=true;
  const title=r.title,body=r.body,expected=r.revision;
  const {data,error:e}=await client.rpc('archive_save_chapter',{p_chapter:id,p_expected_revision:expected,p_title:title,p_body:body});
  saveBusy=false;
  if(e){
   if(status)status.textContent=e.message.includes('CHAPTER_CONFLICT')?'Conflict! Copy your draft before refreshing.':('Save failed: '+e.message);
   if(e.message.includes('CHAPTER_CONFLICT')){clearTimeout(timer);const panel=document.getElementById('historyPanel');if(panel)panel.innerHTML='<p style="color:#e4a477">Another writer saved a newer version. Your text is still in this editor. Copy it somewhere safe before refreshing. No changes were overwritten.</p>'}
   return;
  }
  r.revision=data;
  if(status)status.textContent=(r.title===title&&r.body===body)?'Saved · revision '+data:'Saving newer changes…';
  const b=document.querySelector('[data-entry="'+id+'"]');if(b)b.textContent=r.title;
  if(r.title!==title||r.body!==body){clearTimeout(timer);timer=setTimeout(()=>saveEntry(id),500)}
  return;
 }
 const payload={name:r.name,category:r.category,fields:r.fields};
 const {error:e}=await client.from('archive_entries').update(payload).eq('id',id);
 if(e){if(status)status.textContent='Save failed: '+e.message;return}
 if(status)status.textContent='Saved in cloud';
 const b=document.querySelector('[data-entry="'+id+'"]');if(b)b.textContent=r.name;
}
async function showChapterHistory(id){
 const panel=document.getElementById('historyPanel');if(!panel)return;
 panel.innerHTML='<p class="muted">Loading previous versions…</p>';
 const {data,error:e}=await client.from('chapter_revisions').select('revision,title,body,saved_at').eq('chapter_id',id).order('revision',{ascending:false}).limit(60);
 if(e){panel.innerHTML='<p class="muted">Revision history unavailable: '+esc(e.message)+'</p>';return}
 panel.innerHTML='<h3>Previous versions</h3><p class="muted">Every successful change preserves the preceding version. Restoring also creates a new revision.</p>'+
 ((data||[]).length?(data||[]).map(v=>'<details style="border-top:1px solid #444;padding:10px 0"><summary>Revision '+v.revision+' · '+esc(prettyDate(v.saved_at))+' · '+esc(v.title)+'</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto">'+esc(v.body)+'</pre><button class="btn" data-restore="'+v.revision+'">Restore this version</button></details>').join(''):'<p class="muted">No earlier revisions yet. Make an edit and save to create one.</p>');
 panel.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{
  const current=records.find(x=>x.id===id);if(!current)return;
  if(!confirm('Restore revision '+b.dataset.restore+'? Your current saved version will remain in history. Unsaved text in the editor will be discarded.'))return;
  clearTimeout(timer);
  const {error:e}=await client.rpc('archive_restore_chapter',{p_chapter:id,p_expected_revision:current.revision,p_restore_revision:Number(b.dataset.restore)});
  if(e)return error(e);
  await loadEntries();msg('Earlier version restored');
 });
}
async function createEntry(){const cfg=configs[section];const payload=section==='chapters'?{project_id:project.id,title:'Untitled Chapter',body:''}:{project_id:project.id,entry_type:cfg.type,name:'New '+cfg.type,category:'',fields:{}};const {data,error:e}=await client.from(cfg.table||'archive_entries').insert(payload).select().single();if(e)return error(e);active=data.id;worldEditing=section!=='chapters';chapterEditing=section==='chapters';await loadEntries()}
async function removeEntry(id){if(!confirm('Delete this entry permanently?'))return;clearTimeout(timer);const cfg=configs[section];const {error:e}=await client.from(cfg.table||'archive_entries').delete().eq('id',id);if(e)return error(e);active=null;await loadEntries()}

function pageNav(title){root.classList.remove('focus-mode');stopLive();frame(navigationUI()+'<h2>'+title+'</h2><div id="featureArea" class="panel">Loading…</div>');bindNavigation()}
async function realmSettings(){
 pageNav('Realm Settings');
 const el=document.getElementById('featureArea');
 const owner=project.owner_id===user.id;
 el.innerHTML='<p class="muted">Customize the name and description of this realm. Its chapters, collaborators, and discussions will stay intact.</p>'+
 '<label for="realmName">Realm name</label><input id="realmName" maxlength="120" value="'+esc(project.name)+'" '+(owner?'':'disabled')+'>'+
 '<label for="realmDescription">Description</label><textarea id="realmDescription" maxlength="5000" '+(owner?'':'disabled')+'>'+esc(project.description||'')+'</textarea>'+
 (owner?'<div class="actions" style="margin-top:16px">'+button('Save realm changes','saveRealm','gold')+'</div>':'<p class="muted">Only the realm owner can change these settings right now.</p>');
 if(!owner)return;
 document.getElementById('saveRealm').onclick=async()=>{
   const name=document.getElementById('realmName').value.trim();
   const description=document.getElementById('realmDescription').value.trim();
   if(!name)return msg('Realm name cannot be empty');
   const b=document.getElementById('saveRealm');b.disabled=true;msg('Saving realm settings…');
   const {data,error:e}=await client.from('projects').update({name,description}).eq('id',project.id).select('id,name,description,owner_id').single();
   b.disabled=false;if(e)return error(e);
   project={...project,...data};
   const p=projects.find(p=>p.id===project.id);if(p)Object.assign(p,data);
   realmSettings();msg('Realm settings saved successfully');
 };
}

const prettyDate=d=>new Date(d).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});

function stopLive(){if(liveLoop){clearInterval(liveLoop);liveLoop=null}liveTick++}
function startLive(mode){stopLive();const token=liveTick;liveLoop=setInterval(async()=>{
 if(token!==liveTick||!project||section!==mode||document.hidden)return;
 try{
  if(mode==='board'){
   const input=document.getElementById('threadTitle');
   if(input)return;
   const current=active;
   const {data,error:e}=await client.from('board_threads').select('id,title,author_id,created_at').eq('project_id',project.id).order('created_at',{ascending:false});
   if(e||token!==liveTick||section!=='board')return;
   const list=document.getElementById('threadList');if(!list)return;
   const prior=list.dataset.ids||'',next=(data||[]).map(x=>x.id).join(',');
   if(prior!==next){list.dataset.ids=next;list.innerHTML=(data||[]).map(t=>'<button class="item" data-thread="'+esc(t.id)+'"><strong>'+esc(t.title)+'</strong><div class="muted">'+esc(shortId(t.author_id))+' · '+esc(prettyDate(t.created_at))+'</div></button>').join('')||'<p class="muted">No discussions yet.</p>';list.querySelectorAll('[data-thread]').forEach(b=>b.onclick=()=>openThread(data.find(t=>t.id===b.dataset.thread)))}
   if(current&&document.getElementById('replies'))await refreshReplies(current);
  }else if(mode==='chapters'&&active){
   await updatePresence(active);
   await readPresence(active);
  }
 }catch(e){console.warn('Living Archive refresh:',e)}
 },12000)}
async function loadWriterNames(){
 if(!project)return;
 const {data:members}=await client.from('project_members').select('user_id').eq('project_id',project.id);
 const ids=[...new Set([project.owner_id,user.id,...(members||[]).map(m=>m.user_id)])];
 const {data,error:e}=await client.from('writer_profiles').select('user_id,display_name').in('user_id',ids);
 if(!e)for(const p of data||[])writerNames[p.user_id]=p.display_name;
}
async function profileView(){
 pageNav('My Writer Profile');
 const el=document.getElementById('featureArea');
 const {data,error:e}=await client.from('writer_profiles').select('display_name').eq('user_id',user.id).maybeSingle();
 if(e)return error(e);
 el.innerHTML='<p class="muted">Choose the name other collaborators see on discussions and chapter activity.</p><label for="writerName">Display name</label><input id="writerName" maxlength="40" value="'+esc(data?.display_name||'')+'" placeholder="Your writer name"><div class="actions" style="margin-top:14px">'+button('Save profile','saveProfile','gold')+'</div>';
 document.getElementById('saveProfile').onclick=async()=>{
  const display_name=document.getElementById('writerName').value.trim();
  if(!display_name||display_name.length>40)return msg('Choose a name of 1–40 characters');
  const {error:e}=await client.from('writer_profiles').upsert({user_id:user.id,display_name,updated_at:new Date().toISOString()});
  if(e)return error(e);writerNames[user.id]=display_name;msg('Writer profile saved');
 };
}
async function updatePresence(id){
 if(!project||!user||section!=='chapters'||active!==id||document.hidden)return;
 const {error:e}=await client.from('chapter_presence').upsert({project_id:project.id,chapter_id:id,user_id:user.id,last_seen:new Date().toISOString()},{onConflict:'chapter_id,user_id'});
 if(e)console.warn('Presence:',e.message);
}
async function readPresence(id){
 const el=document.getElementById('chapterPresence');if(!el||active!==id)return;
 const since=new Date(Date.now()-45000).toISOString();
 const {data,error:e}=await client.from('chapter_presence').select('user_id,last_seen').eq('chapter_id',id).gte('last_seen',since).neq('user_id',user.id);
 if(e)return;
 el.textContent=(data||[]).length?(data||[]).map(p=>shortId(p.user_id)).join(', ')+' viewing this chapter':'Only you are viewing this chapter';
}
async function refreshReplies(threadId){
 const el=document.getElementById('replies');if(!el||active!==threadId)return;
 const {data,error:e}=await client.from('board_replies').select('*').eq('thread_id',threadId).order('created_at',{ascending:true});
 if(e||!document.getElementById('replies')||active!==threadId)return;
 const next=(data||[]).map(r=>r.id).join(',');
 if(el.dataset.ids===next)return;
 el.dataset.ids=next;
 el.innerHTML=(data||[]).map(r=>'<div style="border-bottom:1px solid #424638;padding:12px 0"><div class="muted">'+esc(shortId(r.author_id))+' · '+esc(prettyDate(r.created_at))+'</div><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(r.body)+'</p>'+(r.author_id===user.id?'<button class="btn" data-delete-reply="'+esc(r.id)+'">Delete</button>':'')+'</div>').join('')||'<p class="muted">No replies yet.</p>';
 el.querySelectorAll('[data-delete-reply]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this reply?'))return;const {error:e}=await client.from('board_replies').delete().eq('id',b.dataset.deleteReply);if(e)return error(e);el.dataset.ids='';refreshReplies(threadId)});
}

const shortId=id=>writerNames[id]||(id===user.id?'You':('Writer '+String(id).slice(0,8)));
async function notifyCouncil(event_kind,event_id){try{const {error:e}=await client.functions.invoke('council-push',{body:{event_kind,event_id}});if(e)console.warn('Council push:',e.message)}catch(e){console.warn('Council push:',e)}}
async function boardView(){pageNav('The Council Board');await loadWriterNames();const el=document.getElementById('featureArea');el.innerHTML='<p class="muted">A private discussion board for this realm. Only members can read and participate.</p><div class="actions">'+button('＋ Start discussion','newThread','gold')+'</div><div id="threadList"></div><div id="threadDetail"></div>';document.getElementById('newThread').onclick=()=>{document.getElementById('threadDetail').innerHTML='<h2>New discussion</h2><label>Subject</label><input id="threadTitle" maxlength="200" placeholder="What shall the council discuss?"><label>Message</label><textarea id="threadBody" placeholder="Share your idea…"></textarea><div class="actions">'+button('Publish discussion','publishThread','gold')+'</div>';document.getElementById('publishThread').onclick=async()=>{const title=document.getElementById('threadTitle').value.trim(),body=document.getElementById('threadBody').value.trim();if(!title)return msg('Give your discussion a title');const {data,error:e}=await client.from('board_threads').insert({project_id:project.id,author_id:user.id,title,body}).select().single();if(e)return error(e);active=data.id;notifyCouncil('thread',data.id);boardView()}};const {data,error:e}=await client.from('board_threads').select('*').eq('project_id',project.id).order('created_at',{ascending:false});if(e)return error(e);const threads=data||[];document.getElementById('threadList').dataset.ids=threads.map(t=>t.id).join(',');document.getElementById('threadList').innerHTML=threads.map(t=>'<button class="item" data-thread="'+esc(t.id)+'"><strong>'+esc(t.title)+'</strong><div class="muted">'+esc(shortId(t.author_id))+' · '+esc(prettyDate(t.created_at))+'</div></button>').join('')||'<p class="muted">No discussions yet. Start the first one!</p>';document.querySelectorAll('[data-thread]').forEach(b=>b.onclick=()=>openThread(threads.find(t=>t.id===b.dataset.thread)));if(active&&threads.some(t=>t.id===active))openThread(threads.find(t=>t.id===active));startLive('board')}
async function openThread(t){active=t.id;const el=document.getElementById('threadDetail');if(!el)return;el.innerHTML='<div style="border-top:1px solid #555;margin-top:20px;padding-top:15px"><h2>'+esc(t.title)+'</h2><p class="muted">'+esc(shortId(t.author_id))+' · '+esc(prettyDate(t.created_at))+'</p><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(t.body)+'</p>'+(t.author_id===user.id?button('Delete discussion','deleteThread'):'')+'<h2>Replies</h2><div id="replies">Loading…</div><label>Write a reply</label><textarea id="replyBody" placeholder="Your reply…"></textarea>'+button('Post reply','postReply','gold')+'</div>';if(t.author_id===user.id)document.getElementById('deleteThread').onclick=async()=>{if(!confirm('Delete this discussion and its replies?'))return;const {error:e}=await client.from('board_threads').delete().eq('id',t.id);if(e)return error(e);active=null;boardView()};document.getElementById('postReply').onclick=async()=>{const body=document.getElementById('replyBody').value.trim();if(!body)return msg('Write a reply first');const {data:reply,error:e}=await client.from('board_replies').insert({thread_id:t.id,author_id:user.id,body}).select('id').single();if(e)return error(e);notifyCouncil('reply',reply.id);openThread(t)};const {data,error:e}=await client.from('board_replies').select('*').eq('thread_id',t.id).order('created_at',{ascending:true});if(e)return error(e);document.getElementById('replies').dataset.ids=(data||[]).map(r=>r.id).join(',');document.getElementById('replies').innerHTML=(data||[]).map(r=>'<div style="border-bottom:1px solid #424638;padding:12px 0"><div class="muted">'+esc(shortId(r.author_id))+' · '+esc(prettyDate(r.created_at))+'</div><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(r.body)+'</p>'+(r.author_id===user.id?'<button class="btn" data-delete-reply="'+esc(r.id)+'">Delete</button>':'')+'</div>').join('')||'<p class="muted">No replies yet.</p>';document.querySelectorAll('[data-delete-reply]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this reply?'))return;const {error:e}=await client.from('board_replies').delete().eq('id',b.dataset.deleteReply);if(e)return error(e);openThread(t)})}
async function membersView(){pageNav('Collaborators & Permissions');await loadWriterNames();const el=document.getElementById('featureArea');const owner=project.owner_id===user.id;const {data:members,error:e}=await client.from('project_members').select('*').eq('project_id',project.id).order('joined_at',{ascending:true});if(e)return error(e);let canInvite=owner||!!(members||[]).find(m=>m.user_id===user.id&&m.can_manage_members);el.innerHTML='<p class="muted">Everyone with editor access can write chapters and edit the archive. Administrative privileges can be toggled separately.</p><h2>Realm members</h2><div class="item">👑 Owner '+(owner?'(you)':'')+'<div class="muted">Realm administrator</div></div>'+(members||[]).map(m=>'<div class="item"><strong>'+esc(shortId(m.user_id))+'</strong><div class="muted">Member ID: '+esc(m.user_id)+'</div>'+(canInvite?'<label><input type="checkbox" style="width:auto" data-member="'+esc(m.user_id)+'" data-permission="can_manage_members" '+(m.can_manage_members?'checked':'')+'> Manage invitations and members</label><label><input type="checkbox" style="width:auto" data-member="'+esc(m.user_id)+'" data-permission="can_delete_project" '+(m.can_delete_project?'checked':'')+'> Delete realm</label>'+button('Remove collaborator','remove_'+m.user_id):'<p class="muted">Editor access</p>')+'</div>').join('')+(canInvite?'<h2>Invite a collaborator</h2><p class="muted">Generate a single-use code valid for 7 days. Share it privately; anyone with the code and an account can redeem it.</p>'+button('Generate invitation code','generateInvite','gold')+'<div id="inviteResult" style="margin-top:12px"></div>':'<p class="muted">Only authorized administrators can invite new members.</p>');if(!canInvite)return;document.getElementById('generateInvite').onclick=async()=>{const {data,error:e}=await client.rpc('archive_create_invite',{p_project:project.id});if(e)return error(e);const code=String(data);document.getElementById('inviteResult').innerHTML='<label>One-time invitation code</label><textarea id="generatedCode" readonly rows="2">'+esc(code)+'</textarea>'+button('Copy code','copyInvite')+'<p class="muted">Have your collaborator sign in, paste this under “Join a realm”, and tap Join realm.</p>';document.getElementById('copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(code);msg('Invitation code copied')}catch(e){document.getElementById('generatedCode').select();msg('Select and copy the code manually')}}};el.querySelectorAll('[data-permission]').forEach(input=>input.onchange=async()=>{const id=input.dataset.member,key=input.dataset.permission;const {error:e}=await client.from('project_members').update({[key]:input.checked}).eq('project_id',project.id).eq('user_id',id);if(e){input.checked=!input.checked;return error(e)}msg('Permission updated')});(members||[]).forEach(m=>{const b=document.getElementById('remove_'+m.user_id);if(b)b.onclick=async()=>{if(!confirm('Remove this collaborator from the realm?'))return;const {error:e}=await client.from('project_members').delete().eq('project_id',project.id).eq('user_id',m.user_id);if(e)return error(e);membersView()}})}

const launch=document.createElement('button');launch.id='cloudLaunch';launch.className='btn primary';launch.textContent='☁ Open Cloud Archive';launch.style.cssText='position:fixed;right:12px;bottom:85px;z-index:20';launch.onclick=()=>{root.style.display='block';document.documentElement.classList.add('archive-open');launch.hidden=true;init()};document.body.append(launch);
document.documentElement.classList.add('archive-open');
init();
})();
