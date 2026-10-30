const CACHE="quatt-catalog-v2.9.0.0";
const OFFLINE_URL="./offline.html";
const ASSETS=[
  "./","./index.html","./styles.css?v=290","./app.js?v=290","./config.js","./variant-model.js?v=290","./variant-picker.js?v=290","./fonts.css?v=290","./quatt-sans-cyrillic-ext.woff2","./quatt-sans-cyrillic.woff2","./quatt-sans-latin.woff2","./theme.js?v=290",
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
