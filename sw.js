self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||''}}
 event.waitUntil(self.registration.showNotification(data.title||'Fantasy Archive',{body:data.body||'New Council activity',tag:data.tag||'council',icon:'./archive-icon.svg',data:{url:data.url||'./'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const target=new URL(event.notification.data?.url||'./',self.registration.scope).href;
  const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clientsList){if(new URL(client.url).origin===new URL(target).origin){await client.focus();if('navigate' in client)await client.navigate(target);return}}
  await self.clients.openWindow(target);
 })());
});