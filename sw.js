const CACHE="quatt-catalog-v3.0.3.0";
const OFFLINE_URL="./offline.html";
const ASSETS=[
  "./","./index.html","./styles.css?v=303","./app.js?v=303","./dialog-dismiss.js?v=303","./config.js","./variant-model.js?v=303","./product-language.js?v=303","./product-editor-controls.js?v=303","./variant-attributes.js?v=303","./variant-picker.js?v=303","./fonts.css?v=303","./quatt-sans-cyrillic-ext.woff2","./quatt-sans-cyrillic.woff2","./quatt-sans-latin.woff2","./theme.js?v=303",
  "./manifest.webmanifest","./quatt-favicon-64.png","./quatt-app-192.png","./quatt-app-512.png",
  "./quatt-apple-180.png","./favicon.svg","./quatt.gif","./robots.txt","./sitemap.xml",OFFLINE_URL
];
self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate",e=>e.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
])));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  const req=e.request;
  if(req.mode==="navigate"){
    e.respondWith(
      fetch(req).then(r=>{
        const clone=r.clone();
        caches.open(CACHE).then(c=>c.put(req,clone));
        return r;
      }).catch(async()=> (await caches.match(req)) || (await caches.match(OFFLINE_URL)))
    );
    return;
  }
  e.respondWith(
    fetch(req).then(r=>{
      const clone=r.clone();
      caches.open(CACHE).then(c=>c.put(req,clone));
      return r;
    }).catch(()=>caches.match(req))
  );
});
