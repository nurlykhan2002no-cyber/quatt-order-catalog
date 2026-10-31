const CACHE="quatt-catalog-v3.0.5.0";
const OFFLINE_URL="./offline.html";
const ASSETS=["./private-pricing.js?v=305",
  "./","./index.html","./styles.css?v=305","./app.js?v=305","./dialog-dismiss.js?v=305","./config.js","./variant-model.js?v=305","./product-language.js?v=305","./product-editor-controls.js?v=305","./variant-attributes.js?v=305","./variant-picker.js?v=305","./fonts.css?v=305","./quatt-sans-cyrillic-ext.woff2","./quatt-sans-cyrillic.woff2","./quatt-sans-latin.woff2","./theme.js?v=305",
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
