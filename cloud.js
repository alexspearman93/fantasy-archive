(()=>{
'use strict';
const URL='https://pxyhvlvbzseikbcsgtsd.supabase.co';
const KEY='sb_publishable_5gwaAVv8762fM4KFlFPH9A_FM6o1-H6';
const load=()=>new Promise((resolve,reject)=>{if(window.supabase?.createClient)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Could not load Supabase library'));document.head.append(s)});
let client,user,project,section='chapters',active=null,records=[],projects=[],timer=null,revision=0,saveBusy=false,chronicleReady=false,chapterDrafts={},writerNames={},liveLoop=null,liveTick=0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
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
`;document.head.append(styles);
const root=document.createElement('div');root.id='cloudApp';document.body.append(root);
const msg=(t)=>{const x=document.getElementById('cloudStatus');if(x)x.textContent=t};
const button=(label,id,extra='')=>'<button class="btn '+extra+'" id="'+id+'">'+label+'</button>';
const error=e=>{msg(e.message||String(e));console.error(e)};
async function init(){root.innerHTML='<div class="wrap"><p>✦ Opening the cloud archive…</p></div>';try{await load();client=window.supabase.createClient(URL,KEY);const {data:{session}}=await client.auth.getSession();user=session?.user||null;client.auth.onAuthStateChange((_event,session)=>{const next=session?.user||null;if(next?.id!==user?.id){user=next;project=null;active=null;render()}});await render()}catch(e){root.innerHTML='<div class="wrap"><h2>Connection unavailable</h2><p>'+esc(e.message)+'</p>'+button('Try again','retry')+'</div>';document.getElementById('retry').onclick=init}}
function frame(inner){root.innerHTML='<div class="wrap"><div class="bar"><div><h1>✦ THE FANTASY ARCHIVE</h1><div class="muted">Cloud Scriptorium · '+(user?esc(user.email):'Sign in')+'</div></div><div class="actions">'+(user?button('Sign out','signout'):button('Local prototype','local'))+'</div></div>'+inner+'<p class="status" id="cloudStatus" role="status"></p></div>';if(user)document.getElementById('signout').onclick=async()=>{await client.auth.signOut();user=null;project=null;render()};else document.getElementById('local').onclick=()=>{root.style.display='none';document.getElementById('cloudLaunch').hidden=false}}
async function render(){if(!user)return auth();if(!project)return projectList();return workspace()}
function auth(){frame('<div class="panel auth"><h2>Enter the Archive</h2><p class="muted">Sign in or create an account. Email confirmation may be required.</p><form id="authForm"><label>Email</label><input id="email" type="email" autocomplete="email" required><label>Password</label><input id="password" type="password" minlength="6" autocomplete="current-password" required><div class="actions" style="margin-top:18px">'+button('Sign in','login','gold')+button('Create account','signup')+'</div></form></div>');const submit=async(signup)=>{const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value;if(!email||!password)return msg('Enter an email and password');msg('Contacting Supabase…');try{const {data,error:e}=signup?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email,password});if(e)throw e;if(data.session){user=data.user;render()}else msg('Check your email for a confirmation link, then sign in.')}catch(e){error(e)}};document.getElementById('authForm').onsubmit=e=>{e.preventDefault();submit(false)};document.getElementById('signup').onclick=e=>{e.preventDefault();submit(true)}}
async function projectList(){frame('<div class="panel"><h2>Your Realms</h2><p class="muted">Projects are private to their owner and authorized members.</p><div id="projects">Loading…</div><div class="actions" style="margin-top:15px"><input id="newProject" placeholder="Name your new realm" style="max-width:350px">'+button('Create realm','createProject','gold')+'</div><hr style="border-color:#444"><h2>Join a realm</h2><p class="muted">Paste a one-time invitation code from a collaborator.</p><div class="actions"><input id="inviteCode" placeholder="Invitation code" style="max-width:370px">'+button('Join realm','joinRealm','gold')+'</div></div>');document.getElementById('joinRealm').onclick=async()=>{const code=document.getElementById('inviteCode').value.trim();if(!code)return msg('Enter your invitation code');const {error:e}=await client.rpc('archive_redeem_invite',{p_token:code});if(e)return error(e);msg('Welcome to the realm!');await projectList()};const {data,error:e}=await client.from('projects').select('id,name,description,owner_id').order('created_at',{ascending:false});if(e)return error(e);projects=data||[];document.getElementById('projects').innerHTML=projects.length?projects.map(p=>'<button class="item" data-project="'+esc(p.id)+'">'+esc(p.name)+'</button>').join(''):'<p class="muted">No realms yet. Create your first one below.</p>';document.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>{project=projects.find(p=>p.id===b.dataset.project);active=null;workspace()});document.getElementById('createProject').onclick=async()=>{const name=document.getElementById('newProject').value.trim();if(!name)return msg('Enter a realm name');const {data,error:e}=await client.from('projects').insert({name,owner_id:user.id}).select().single();if(e)return error(e);project=data;workspace()}}
const configs={chapters:{table:'chapters',title:'title',fields:[['title','Chapter title'],['body','Manuscript']]},characters:{type:'character',fields:[['name','Name'],['category','Role / title'],['description','Background'],['personality','Personality'],['motivation','Motivations'],['relationships','Relationships'],['notes','Notes']]},locations:{type:'location',fields:[['name','Name'],['category','Region'],['description','Description'],['history','History'],['connections','Connections'],['notes','Notes']]},lore:{type:'lore',fields:[['name','Name'],['category','Category'],['summary','Summary'],['details','Lore'],['connections','Connections'],['notes','Notes']]}};
async function workspace(){stopLive();if(section==='profile')return profileView();if(section==='board')return boardView();if(section==='members')return membersView();if(section==='settings')return realmSettings();frame('<div class="actions">'+button('← Realms','back')+'<h2 style="margin:0">'+esc(project.name)+'</h2></div><div class="tabs">'+[...Object.keys(configs),'board','members','settings','profile'].map(k=>button(({board:'Message Board',members:'Collaborators',settings:'Realm Settings',profile:'My Profile'})[k]||k[0].toUpperCase()+k.slice(1),'tab_'+k,section===k?'gold':'')).join('')+'</div><div class="grid"><aside class="panel"><div class="actions" style="justify-content:space-between"><b>Entries</b>'+button('＋ New','newEntry','gold')+'</div><div id="entries" style="margin-top:14px">Loading…</div></aside><div class="panel" id="editor">Choose an entry or create one.</div></div>');document.getElementById('back').onclick=()=>{project=null;active=null;projectList()};[...Object.keys(configs),'board','members','settings','profile'].forEach(k=>document.getElementById('tab_'+k).onclick=()=>{section=k;active=null;workspace()});document.getElementById('newEntry').onclick=()=>createEntry();await loadEntries()}
async function loadEntries(){const cfg=configs[section];let q=client.from(cfg.table||'archive_entries').select('*').eq('project_id',project.id);if(cfg.type)q=q.eq('entry_type',cfg.type);const {data,error:e}=await q.order('updated_at',{ascending:false});if(e)return error(e);records=data||[];const list=document.getElementById('entries');if(!list)return;list.innerHTML=records.map(r=>'<button class="item '+(active===r.id?'on':'')+'" data-entry="'+esc(r.id)+'">'+esc(r.title||r.name)+'</button>').join('')||'<p class="muted">Nothing here yet.</p>';list.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>{active=b.dataset.entry;drawEditor()});if(!records.some(r=>r.id===active))active=records[0]?.id||null;drawEditor()}
function drawEditor(){stopLive();const r=records.find(x=>x.id===active),el=document.getElementById('editor');if(!el)return;if(!r){el.innerHTML='<p class="muted">Create an entry to begin.</p>';return}const cfg=configs[section];const vals={...r,...(r.fields||{})};el.innerHTML='<h2>'+esc(r.title||r.name)+'</h2><p class="muted">Changes save automatically to your private cloud project.</p>'+cfg.fields.map(([key,label])=>'<label for="field_'+key+'">'+label+'</label>'+(key==='body'||['description','personality','motivation','relationships','history','connections','notes','summary','details'].includes(key)?'<textarea class="'+(['body','details'].includes(key)?'long':'')+'" data-edit="'+key+'" id="field_'+key+'">'+esc(vals[key])+'</textarea>':'<input data-edit="'+key+'" id="field_'+key+'" value="'+esc(vals[key])+'">')).join('')+(section==='chapters'?'<p class="muted" id="chapterPresence">Checking other writers…</p><div class="actions" style="margin-top:12px">'+button('Revision history','chapterHistory')+button('Refresh chapter','refreshChapter')+'</div><div id="historyPanel"></div>':'')+'<div class="actions" style="margin-top:16px">'+button('Delete entry','deleteEntry')+'<span class="status" id="editStatus">Saved in cloud</span></div>';el.querySelectorAll('[data-edit]').forEach(input=>input.addEventListener('input',()=>{const current=records.find(x=>x.id===active);if(!current)return;const key=input.dataset.edit;const value=input.value;if(section==='chapters'||key==='name'||key==='category')current[key]=value;else current.fields={...(current.fields||{}),[key]:value};document.getElementById('editStatus').textContent='Unsaved changes…';clearTimeout(timer);const id=current.id;timer=setTimeout(()=>saveEntry(id),900)}));if(section==='chapters'){loadWriterNames().then(()=>{updatePresence(r.id);readPresence(r.id);startLive('chapters')});document.getElementById('chapterHistory').onclick=()=>showChapterHistory(r.id);document.getElementById('refreshChapter').onclick=async()=>{if(document.getElementById('editStatus')?.textContent==='Unsaved changes…'&&!confirm('Discard unsaved changes and load the latest version?'))return;clearTimeout(timer);await loadEntries()}}document.getElementById('deleteEntry').onclick=()=>removeEntry(r.id)}
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
async function createEntry(){const cfg=configs[section];const payload=section==='chapters'?{project_id:project.id,title:'Untitled Chapter',body:''}:{project_id:project.id,entry_type:cfg.type,name:'New '+cfg.type,category:'',fields:{}};const {data,error:e}=await client.from(cfg.table||'archive_entries').insert(payload).select().single();if(e)return error(e);active=data.id;await loadEntries()}
async function removeEntry(id){if(!confirm('Delete this entry permanently?'))return;clearTimeout(timer);const cfg=configs[section];const {error:e}=await client.from(cfg.table||'archive_entries').delete().eq('id',id);if(e)return error(e);active=null;await loadEntries()}

function pageNav(title){stopLive();frame('<div class="actions">'+button('← Realms','back')+'<h2 style="margin:0">'+esc(project.name)+'</h2></div><div class="tabs">'+[...Object.keys(configs),'board','members','settings','profile'].map(k=>button(({board:'Message Board',members:'Collaborators',settings:'Realm Settings',profile:'My Profile'})[k]||k[0].toUpperCase()+k.slice(1),'tab_'+k,section===k?'gold':'')).join('')+'</div><h2>'+title+'</h2><div id="featureArea" class="panel">Loading…</div>');document.getElementById('back').onclick=()=>{project=null;active=null;projectList()};[...Object.keys(configs),'board','members','settings','profile'].forEach(k=>document.getElementById('tab_'+k).onclick=()=>{section=k;active=null;workspace()})}

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
async function boardView(){pageNav('The Council Board');await loadWriterNames();const el=document.getElementById('featureArea');el.innerHTML='<p class="muted">A private discussion board for this realm. Only members can read and participate.</p><div class="actions">'+button('＋ Start discussion','newThread','gold')+'</div><div id="threadList"></div><div id="threadDetail"></div>';document.getElementById('newThread').onclick=()=>{document.getElementById('threadDetail').innerHTML='<h2>New discussion</h2><label>Subject</label><input id="threadTitle" maxlength="200" placeholder="What shall the council discuss?"><label>Message</label><textarea id="threadBody" placeholder="Share your idea…"></textarea><div class="actions">'+button('Publish discussion','publishThread','gold')+'</div>';document.getElementById('publishThread').onclick=async()=>{const title=document.getElementById('threadTitle').value.trim(),body=document.getElementById('threadBody').value.trim();if(!title)return msg('Give your discussion a title');const {data,error:e}=await client.from('board_threads').insert({project_id:project.id,author_id:user.id,title,body}).select().single();if(e)return error(e);active=data.id;boardView()}};const {data,error:e}=await client.from('board_threads').select('*').eq('project_id',project.id).order('created_at',{ascending:false});if(e)return error(e);const threads=data||[];document.getElementById('threadList').dataset.ids=threads.map(t=>t.id).join(',');document.getElementById('threadList').innerHTML=threads.map(t=>'<button class="item" data-thread="'+esc(t.id)+'"><strong>'+esc(t.title)+'</strong><div class="muted">'+esc(shortId(t.author_id))+' · '+esc(prettyDate(t.created_at))+'</div></button>').join('')||'<p class="muted">No discussions yet. Start the first one!</p>';document.querySelectorAll('[data-thread]').forEach(b=>b.onclick=()=>openThread(threads.find(t=>t.id===b.dataset.thread)));if(active&&threads.some(t=>t.id===active))openThread(threads.find(t=>t.id===active));startLive('board')}
async function openThread(t){active=t.id;const el=document.getElementById('threadDetail');if(!el)return;el.innerHTML='<div style="border-top:1px solid #555;margin-top:20px;padding-top:15px"><h2>'+esc(t.title)+'</h2><p class="muted">'+esc(shortId(t.author_id))+' · '+esc(prettyDate(t.created_at))+'</p><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(t.body)+'</p>'+(t.author_id===user.id?button('Delete discussion','deleteThread'):'')+'<h2>Replies</h2><div id="replies">Loading…</div><label>Write a reply</label><textarea id="replyBody" placeholder="Your reply…"></textarea>'+button('Post reply','postReply','gold')+'</div>';if(t.author_id===user.id)document.getElementById('deleteThread').onclick=async()=>{if(!confirm('Delete this discussion and its replies?'))return;const {error:e}=await client.from('board_threads').delete().eq('id',t.id);if(e)return error(e);active=null;boardView()};document.getElementById('postReply').onclick=async()=>{const body=document.getElementById('replyBody').value.trim();if(!body)return msg('Write a reply first');const {error:e}=await client.from('board_replies').insert({thread_id:t.id,author_id:user.id,body});if(e)return error(e);openThread(t)};const {data,error:e}=await client.from('board_replies').select('*').eq('thread_id',t.id).order('created_at',{ascending:true});if(e)return error(e);document.getElementById('replies').dataset.ids=(data||[]).map(r=>r.id).join(',');document.getElementById('replies').innerHTML=(data||[]).map(r=>'<div style="border-bottom:1px solid #424638;padding:12px 0"><div class="muted">'+esc(shortId(r.author_id))+' · '+esc(prettyDate(r.created_at))+'</div><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(r.body)+'</p>'+(r.author_id===user.id?'<button class="btn" data-delete-reply="'+esc(r.id)+'">Delete</button>':'')+'</div>').join('')||'<p class="muted">No replies yet.</p>';document.querySelectorAll('[data-delete-reply]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this reply?'))return;const {error:e}=await client.from('board_replies').delete().eq('id',b.dataset.deleteReply);if(e)return error(e);openThread(t)})}
async function membersView(){pageNav('Collaborators & Permissions');await loadWriterNames();const el=document.getElementById('featureArea');const owner=project.owner_id===user.id;const {data:members,error:e}=await client.from('project_members').select('*').eq('project_id',project.id).order('joined_at',{ascending:true});if(e)return error(e);let canInvite=owner||!!(members||[]).find(m=>m.user_id===user.id&&m.can_manage_members);el.innerHTML='<p class="muted">Everyone with editor access can write chapters and edit the archive. Administrative privileges can be toggled separately.</p><h2>Realm members</h2><div class="item">👑 Owner '+(owner?'(you)':'')+'<div class="muted">Realm administrator</div></div>'+(members||[]).map(m=>'<div class="item"><strong>'+esc(shortId(m.user_id))+'</strong><div class="muted">Member ID: '+esc(m.user_id)+'</div>'+(canInvite?'<label><input type="checkbox" style="width:auto" data-member="'+esc(m.user_id)+'" data-permission="can_manage_members" '+(m.can_manage_members?'checked':'')+'> Manage invitations and members</label><label><input type="checkbox" style="width:auto" data-member="'+esc(m.user_id)+'" data-permission="can_delete_project" '+(m.can_delete_project?'checked':'')+'> Delete realm</label>'+button('Remove collaborator','remove_'+m.user_id):'<p class="muted">Editor access</p>')+'</div>').join('')+(canInvite?'<h2>Invite a collaborator</h2><p class="muted">Generate a single-use code valid for 7 days. Share it privately; anyone with the code and an account can redeem it.</p>'+button('Generate invitation code','generateInvite','gold')+'<div id="inviteResult" style="margin-top:12px"></div>':'<p class="muted">Only authorized administrators can invite new members.</p>');if(!canInvite)return;document.getElementById('generateInvite').onclick=async()=>{const {data,error:e}=await client.rpc('archive_create_invite',{p_project:project.id});if(e)return error(e);const code=String(data);document.getElementById('inviteResult').innerHTML='<label>One-time invitation code</label><textarea id="generatedCode" readonly rows="2">'+esc(code)+'</textarea>'+button('Copy code','copyInvite')+'<p class="muted">Have your collaborator sign in, paste this under “Join a realm”, and tap Join realm.</p>';document.getElementById('copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(code);msg('Invitation code copied')}catch(e){document.getElementById('generatedCode').select();msg('Select and copy the code manually')}}};el.querySelectorAll('[data-permission]').forEach(input=>input.onchange=async()=>{const id=input.dataset.member,key=input.dataset.permission;const {error:e}=await client.from('project_members').update({[key]:input.checked}).eq('project_id',project.id).eq('user_id',id);if(e){input.checked=!input.checked;return error(e)}msg('Permission updated')});(members||[]).forEach(m=>{const b=document.getElementById('remove_'+m.user_id);if(b)b.onclick=async()=>{if(!confirm('Remove this collaborator from the realm?'))return;const {error:e}=await client.from('project_members').delete().eq('project_id',project.id).eq('user_id',m.user_id);if(e)return error(e);membersView()}})}

const launch=document.createElement('button');launch.id='cloudLaunch';launch.className='btn primary';launch.textContent='☁ Open Cloud Archive';launch.style.cssText='position:fixed;right:12px;bottom:85px;z-index:20';launch.onclick=()=>{root.style.display='block';launch.hidden=true;init()};document.body.append(launch);
init();
})();
