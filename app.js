import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const PHONE = "77076154747";
const SITE_NAME = "QUATT QURYLYS";
const BASE_WA = "Здравствуйте! Пришёл с сайта QUATT QURYLYS. Хочу уточнить наличие / заказать товар.";
const state = {
  session:null, role:"guest", email:"", customerMode:false, roleMode:"native",
  categories:[], products:[], images:[], staff:[], sellerNames:[], banners:[],
  cat:"all", q:"", brand:"all", availability:"all", max:"", sort:"Сначала новые", specFilters:{},
  editing:null, formImages:[], cart:[], customerCart:[], favorites:[], recent:[], orders:[],
  selectedSellerId:null, orderTab:"active", paidSeenReady:false, viewCounts:{},
  lightbox:{images:[],index:0,scale:1,x:0,y:0,pointers:new Map(),lastDist:0}
};

const ids = [
  "loginBtn","logoutBtn","customerModeBtn","roleModeBtn","manageBtn","manageBtnDesktop","sideBottom","addProductBtn","mobileAddProductBtn",
  "desktopCategories","mobileCategory","pageTitle","searchInput","searchSuggestions","clearSearchBtn","brandFilter","availabilityFilter","maxPrice","sortFilter","dynamicFilters","resultCount","stateBox","catalogGrid","recentSection","recentGrid","clearRecentBtn",
  "bannerStrip","loginDialog","loginForm","loginEmail","loginPassword","loginError","detailDialog","detailTitle","detailSubtitle","detailContent",
  "productDialog","productForm","productDialogTitle","productId","photoInput","photoThumbs","fName","fCategory","fBrand","fPrice","fPriceMode","fAvailability","fBadge","badgePreview","fDelivery","fOldPrice","fSaleEnd","fSpecs","fVariants","fVideoUrl","fRelated","fBundle","fCost","fSupplier","fSupplierAddress","fSupplierContact","fCheckedDate","fNotes","fActive","manualMarkup","applyManualMarkup","marginInfo","deleteProductBtn","productHistoryBtn","ownerCategoryAdd","newCategoryInForm","addCategoryInFormBtn",
  "manageDialog","staffSection","sellerNamesSection","staffForm","staffEmail","staffRole","staffList","categoryForm","newCategoryName","categoryManager","sellerNameForm","newSellerName","sellerNamesList","bannerForm","bannerTitle","bannerSubtitle","bannerCategory","bannerManager","excelImport","exportExcelBtn","exportSatuBtn","productHistoryDialog","productHistorySub","productHistoryList",
  "toastHost","ordersBtn","ordersBadge","myOrdersBtn","sellerPickerWrap","sellerPicker","cartBtn","cartBadge","cartDialog","cartItems","cartTotal","checkoutBtn","checkoutDialog","checkoutForm","clientName","clientPhone","orderNote","initialStatus","ordersDialog","ordersDialogTitle","ordersDialogSub","ordersList","orderTabs",
  "favoritesBtn","favoritesBadge","favoritesDialog","favoritesList","customerCartBtn","customerCartBadge","customerCartDialog","customerCartItems","customerCartTotal","sendCustomerCartBtn","contactsBtn","contactsDialog","contactWhatsappBtn","footerWhatsappBtn","helpWhatsappBtn","notFoundBtn","recentBtn",
  "dashboardBtn","dashboardDialog","dashboardContent","bulkBtn","bulkDialog","bulkCategory","bulkMarkup","bulkVisibility","bulkSelectAll","applyBulkBtn","bulkProducts",
  "lightboxDialog","lightboxClose","lightboxPrev","lightboxNext","lightboxStage","lightboxImage","lightboxCounter","zoomOutBtn","zoomResetBtn","zoomInBtn"
];
const el = Object.fromEntries(ids.map(id=>[id,$(id)]));

const isAdmin = () => state.role === "admin";
const isProcurement = () => state.role === "procurement";
const isSellerAccount = () => state.role === "seller";
const isSeller = () => isSellerAccount() || (isAdmin() && state.roleMode === "seller");
const internalMode = () => !state.customerMode && !(isAdmin() && state.roleMode === "seller");
const canViewInternal = () => (isAdmin() || isProcurement()) && internalMode();
const canEditProducts = () => (isAdmin() || isProcurement()) && internalMode();
const canManageOrders = () => (isAdmin() || isProcurement()) && internalMode();
const canManageRoles = () => isAdmin() && internalMode();
const priv = () => canViewInternal();
const roleLabel = r => r === "admin" ? "Администратор" : r === "procurement" ? "Снабженец" : r === "seller" ? "Продавец" : "Гость";
const money = n => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Number(n||0))+" ₸";
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const norm = s => String(s||"").toLowerCase().replace(/ё/g,"е").replace(/[^a-zа-я0-9]+/gi," ").trim();
const uniq = a => [...new Set(a.filter(Boolean))];

function toast(msg,error=false){const d=document.createElement("div");d.className="toast"+(error?" error":"");d.textContent=msg;el.toastHost.appendChild(d);setTimeout(()=>d.remove(),3800)}
function closeDialog(id){const d=$(id);if(d?.open)d.close()}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));
function publicUrl(path){return path?supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl:""}
function imgsFor(id){return state.images.filter(i=>i.product_id===id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))}
function catName(id){return state.categories.find(c=>c.id===id)?.name||"Без категории"}
function availabilityLabel(v){return v==="in_stock"?"В наличии":v==="out_of_stock"?"Нет в наличии":"Под заказ"}
function saleExpired(p){return !!p.sale_end && new Date(p.sale_end+"T23:59:59")<new Date()}
function validSale(p){return Number(p.old_price)>Number(p.price) && (!p.sale_end || !saleExpired(p))}
function effectivePrice(p){return Number(p.old_price)>Number(p.price) && saleExpired(p)?Number(p.old_price):Number(p.price)}
function priceText(p){if(p.price_mode==="ask")return "Уточнить цену";return (p.price_mode==="from"?"от ":"")+money(effectivePrice(p))}
function saleInfo(p){if(!validSale(p)||!p.sale_end)return "";const end=new Date(p.sale_end+"T23:59:59"),now=new Date();const days=Math.max(0,Math.ceil((end-now)/86400000));const date=new Date(p.sale_end+"T00:00:00").toLocaleDateString("ru-RU");if(days===0)return `Акция заканчивается сегодня`;if(days<=3)return `Акция до ${date} · осталось ${days} ${days===1?"день":"дня"}`;return `Акция до ${date}`}
function whatsappUrl(text=BASE_WA){return `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`}
function openWhatsapp(text){window.open(whatsappUrl(text),"_blank","noopener")}

function saveLocal(){localStorage.setItem("quatt-favorites",JSON.stringify(state.favorites));localStorage.setItem("quatt-recent",JSON.stringify(state.recent));localStorage.setItem("quatt-customer-cart",JSON.stringify(state.customerCart))}
function loadLocal(){try{state.favorites=JSON.parse(localStorage.getItem("quatt-favorites")||"[]")}catch{state.favorites=[]}try{state.recent=JSON.parse(localStorage.getItem("quatt-recent")||"[]")}catch{state.recent=[]}try{state.customerCart=JSON.parse(localStorage.getItem("quatt-customer-cart")||"[]")}catch{state.customerCart=[]}}

async function loadRole(){if(!state.session){state.role="guest";state.email="";return}state.email=state.session.user.email||"";const {data,error}=await supabase.rpc("catalog_role");if(error){console.warn(error);state.role="seller";return}state.role=data||"seller"}
async function loadData(){
  try{
    const catQ=supabase.from("categories").select("*").order("sort_order").order("name");
    const imgQ=supabase.from("product_images").select("*").order("sort_order");
    const prodQ=(isAdmin()||isProcurement())?supabase.from("products").select("*").order("created_at",{ascending:false}):supabase.rpc("get_public_products");
    const sellersQ=state.session?supabase.from("seller_names").select("*").order("sort_order").order("name"):Promise.resolve({data:[],error:null});
    const bannerQ=supabase.from("site_banners").select("*").order("sort_order").order("created_at");
    const [cats,imgs,prods,sellers,banners]=await Promise.all([catQ,imgQ,prodQ,sellersQ,bannerQ]);
    for(const q of [cats,imgs,prods,sellers,banners])if(q.error)throw q.error;
    state.categories=cats.data||[];state.images=imgs.data||[];state.products=prods.data||[];state.sellerNames=sellers.data||[];state.banners=banners.data||[];
    syncSelectedSeller();render();openFromUrl();
  }catch(e){console.error(e);el.catalogGrid.classList.add("hidden");el.stateBox.classList.remove("hidden");el.stateBox.innerHTML=`<h2>Не удалось открыть каталог</h2><p>${esc(e.message||e)}</p><p class="fine">Если это произошло сразу после обновления, сначала выполните SUPABASE_UPDATE_V2_5.sql.</p>`}
}

function sellerSelectionKey(){return `quatt-seller-name:${state.email||"shared"}`}
function selectedSeller(){return state.sellerNames.find(x=>x.id===state.selectedSellerId)||null}
function syncSelectedSeller(){if(!isSeller()){state.selectedSellerId=null;return}const active=state.sellerNames.filter(x=>x.active!==false);const saved=localStorage.getItem(sellerSelectionKey());if(saved&&active.some(x=>x.id===saved))state.selectedSellerId=saved;else if(!active.some(x=>x.id===state.selectedSellerId))state.selectedSellerId=active[0]?.id||null;if(state.selectedSellerId)localStorage.setItem(sellerSelectionKey(),state.selectedSellerId);loadCart()}
function renderAuth(){
  const clientView=state.customerMode;
  const sellerView=isSeller();
  const internal=internalMode();
  el.loginBtn.classList.toggle("hidden",!!state.session);
  el.logoutBtn.classList.toggle("hidden",!state.session||clientView);
  el.customerModeBtn.classList.toggle("hidden",!isAdmin()||sellerView);
  el.roleModeBtn.classList.toggle("hidden",!isAdmin()||clientView);
  el.roleModeBtn.textContent=state.roleMode==="seller"?"⇄ Администратор":"⇄ Продавец";
  el.manageBtn.classList.toggle("hidden",!isAdmin()||!internal);
  el.sideBottom.classList.toggle("hidden",!isAdmin()||!internal);
  el.addProductBtn.classList.toggle("hidden",!canEditProducts());
  el.mobileAddProductBtn.classList.toggle("hidden",!canEditProducts());
  el.ownerCategoryAdd.classList.toggle("hidden",!canEditProducts());
  el.ordersBtn.classList.toggle("hidden",!canManageOrders());
  el.dashboardBtn.classList.toggle("hidden",!isAdmin()||!internal);
  el.bulkBtn.classList.toggle("hidden",!canEditProducts());
  el.myOrdersBtn.classList.toggle("hidden",!sellerView||clientView);
  el.cartBtn.classList.toggle("hidden",!sellerView||clientView);
  el.sellerPickerWrap.classList.toggle("hidden",!sellerView||clientView);
  if(sellerView){const active=state.sellerNames.filter(x=>x.active!==false);el.sellerPicker.innerHTML=active.length?active.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join(""):`<option value="">Нет имён</option>`;el.sellerPicker.value=state.selectedSellerId||"";el.sellerPicker.disabled=!active.length}
  el.customerModeBtn.textContent=clientView?"◉ Выйти из режима":"◉ Клиент";
  document.body.classList.toggle("guest-mode",!state.session);
  document.body.classList.toggle("customer-mode",clientView);
  document.body.classList.toggle("seller-mode",sellerView&&!clientView);
  document.body.classList.toggle("internal-mode",!!state.session&&internal&&!sellerView&&!clientView);
  syncMobileHeaderUI();
  renderLocalBadges();
}

function renderCategories(){
  const cats=state.categories.filter(c=>c.active||canViewInternal());
  const visibleProducts=state.products.filter(p=>p.active!==false||canViewInternal());
  const counts={};visibleProducts.forEach(p=>{if(p.category_id)counts[p.category_id]=(counts[p.category_id]||0)+1});
  el.desktopCategories.innerHTML=`<button class="nav ${state.cat==="all"?"selected":""}" data-cat="all"><span>Все товары</span><span class="count">${visibleProducts.length}</span></button>`+cats.map(c=>`<button class="nav ${state.cat===c.id?"selected":""}" data-cat="${c.id}"><span>${esc(c.name)}</span><span class="count">${counts[c.id]||0}</span></button>`).join("");
  el.desktopCategories.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>setCat(b.dataset.cat));
  el.mobileCategory.innerHTML=`<option value="all">Все категории (${visibleProducts.length})</option>`+cats.map(c=>`<option value="${c.id}">${esc(c.name)} (${counts[c.id]||0})</option>`).join("");el.mobileCategory.value=state.cat;
  el.fCategory.innerHTML=cats.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  el.bannerCategory.innerHTML=`<option value="">Без категории</option>`+cats.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  el.bulkCategory.innerHTML=`<option value="">Категория — не менять</option>`+cats.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
}
function setCat(v){state.cat=v;state.specFilters={};renderCategories();renderProducts()}
function parseSpecs(text){const o={};String(text||"").split(/\r?\n/).forEach(line=>{const m=line.match(/^\s*([^:—-]{2,40})\s*[:—-]\s*(.+)\s*$/);if(m)o[m[1].trim()]=m[2].trim()});return o}
function commonSpecKey(k){const n=norm(k);if(n.includes("цвет"))return "Цвет";if(n.includes("размер"))return "Размер";if(n.includes("диаметр")||n==="d")return "Диаметр";if(n.includes("мощност"))return "Мощность";if(n.includes("материал"))return "Материал";return null}
function renderFilters(){
  const filterProducts=state.products.filter(p=>canViewInternal()||p.active!==false);
  const brands=uniq(filterProducts.map(p=>p.brand).filter(Boolean)).sort((a,b)=>a.localeCompare(b,"ru"));el.brandFilter.innerHTML=`<option value="all">Все бренды</option>`+brands.map(b=>`<option>${esc(b)}</option>`).join("");if(!brands.includes(state.brand))state.brand="all";el.brandFilter.value=state.brand;
  const values={};filterProducts.forEach(p=>Object.entries(parseSpecs(p.specs)).forEach(([k,v])=>{const ck=commonSpecKey(k);if(ck){values[ck]??=new Set();values[ck].add(v)}}));
  el.dynamicFilters.innerHTML=Object.entries(values).filter(([,s])=>s.size>1).slice(0,5).map(([k,s])=>`<select class="choice" data-spec-filter="${esc(k)}"><option value="">${esc(k)}: все</option>${[...s].sort().map(v=>`<option ${state.specFilters[k]===v?"selected":""}>${esc(v)}</option>`).join("")}</select>`).join("");
  el.dynamicFilters.querySelectorAll("[data-spec-filter]").forEach(s=>s.onchange=()=>{state.specFilters[s.dataset.specFilter]=s.value;renderProducts()});
}
function filteredProducts(){
  let arr=state.products.filter(p=>canViewInternal()||p.active!==false);if(state.cat!=="all")arr=arr.filter(p=>p.category_id===state.cat);if(state.brand!=="all")arr=arr.filter(p=>p.brand===state.brand);if(state.availability!=="all")arr=arr.filter(p=>(p.availability||"order")===state.availability);if(state.max)arr=arr.filter(p=>Number(p.price)<=Number(state.max));
  const q=norm(state.q);if(q)arr=arr.filter(p=>norm([p.name,p.brand,p.specs,p.keywords,catName(p.category_id)].join(" ")).includes(q));
  for(const [k,v] of Object.entries(state.specFilters)){if(!v)continue;arr=arr.filter(p=>{const specs=parseSpecs(p.specs);return Object.entries(specs).some(([sk,sv])=>commonSpecKey(sk)===k&&sv===v)})}
  if(state.sort==="Цена: по возрастанию")arr.sort((a,b)=>Number(a.price)-Number(b.price));else if(state.sort==="Цена: по убыванию")arr.sort((a,b)=>Number(b.price)-Number(a.price));else if(state.sort==="Популярные")arr.sort((a,b)=>(state.viewCounts[b.id]||0)-(state.viewCounts[a.id]||0));else arr.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));return arr;
}
function productCard(p,mini=false){const cover=imgsFor(p.id)[0];const fav=state.favorites.includes(p.id);const sale=validSale(p);return `<article class="product ${mini?"mini-product":""}" data-product-card="${p.id}"><a class="photo" href="${productLink(p.id)}" data-open-product="${p.id}">${cover?`<img src="${publicUrl(cover.image_path)}" alt="${esc(p.name)}" loading="lazy">`:`<span class="no-photo">Q</span>`}<span class="order-tag ${p.availability||"order"}">${esc(availabilityLabel(p.availability||"order"))}</span>${p.badge&&!(norm(p.badge)==="акция"&&!validSale(p))?`<span class="product-badge badge-${norm(p.badge)}">${esc(p.badge)}</span>`:""}</a><button class="favorite ${fav?"on":""}" data-favorite="${p.id}" aria-label="Избранное">${fav?"♥":"♡"}</button><div class="product-info"><div class="product-category">${esc(catName(p.category_id))}${p.brand?" · "+esc(p.brand):""}</div><a class="product-title" href="${productLink(p.id)}" data-open-product="${p.id}">${esc(p.name)}</a><div class="price-row"><div class="product-price">${esc(priceText(p))}</div>${sale?`<span class="old-price">${money(p.old_price)}</span>`:""}</div><div class="delivery">◷ ${esc(p.delivery||"Срок уточняется")}</div>${sale&&p.sale_end?`<div class="sale-deadline">${esc(saleInfo(p))}</div>`:""}${priv()?`<div class="private-price">Закуп: ${money(p.cost)}<span>+${money(Number(p.price)-Number(p.cost))}</span></div>`:""}<div class="card-actions"><button class="small-btn" data-customer-add="${p.id}">＋ В корзину</button>${isSeller()?`<button class="small-btn seller-add" data-seller-add="${p.id}">＋ Продавцу</button>`:""}</div></div></article>`}
function bindProductCards(root=document){root.querySelectorAll("[data-open-product]").forEach(b=>b.onclick=e=>{e.preventDefault();openDetail(b.dataset.openProduct)});root.querySelectorAll("[data-favorite]").forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFavorite(b.dataset.favorite)});root.querySelectorAll("[data-customer-add]").forEach(b=>b.onclick=e=>{e.stopPropagation();addCustomerCart(b.dataset.customerAdd)});root.querySelectorAll("[data-seller-add]").forEach(b=>b.onclick=e=>{e.stopPropagation();addToCart(b.dataset.sellerAdd);toast("Добавлено в корзину продавца")})}
function renderProducts(){
  const arr=filteredProducts();el.resultCount.textContent=`${arr.length} ${arr.length===1?"товар":"товаров"}`;el.stateBox.classList.toggle("hidden",arr.length>0);el.catalogGrid.classList.toggle("hidden",arr.length===0);if(!arr.length){el.stateBox.innerHTML=`<h2>Ничего не найдено</h2><p>Измени фильтры или напиши нам в WhatsApp — найдём товар под заказ.</p><button class="whatsapp-btn" id="emptyWhatsapp">Написать в WhatsApp</button>`;$("emptyWhatsapp").onclick=()=>openWhatsapp("Здравствуйте! Пришёл с сайта QUATT QURYLYS. Не нашёл нужный товар. Помогите подобрать / заказать.");return}el.catalogGrid.innerHTML=arr.map(p=>productCard(p)).join("");bindProductCards(el.catalogGrid);renderRecent();
}
function renderBanners(){const rows=state.banners.filter(b=>b.active!==false);el.bannerStrip.classList.toggle("hidden",!rows.length);el.bannerStrip.innerHTML=rows.map(b=>`<button class="hero-banner" data-banner-cat="${b.category_id||"all"}"><strong>${esc(b.title)}</strong>${b.subtitle?`<span>${esc(b.subtitle)}</span>`:""}</button>`).join("");el.bannerStrip.querySelectorAll("[data-banner-cat]").forEach(b=>b.onclick=()=>{setCat(b.dataset.bannerCat);window.scrollTo({top:0,behavior:"smooth"})})}
function renderRecent(){const rows=state.recent.map(id=>state.products.find(p=>p.id===id)).filter(p=>p&&(canViewInternal()||p.active!==false)).slice(0,8);el.recentSection.classList.toggle("hidden",!rows.length);el.recentGrid.innerHTML=rows.map(p=>productCard(p,true)).join("");bindProductCards(el.recentGrid)}
function render(){renderAuth();renderCategories();renderFilters();renderBanners();renderProducts();renderLocalBadges()}

function updateSeo(p=null){const title=p?`${p.name} — QUATT QURYLYS`:`QUATT QURYLYS — Каталог товаров`;document.title=title;document.querySelector('meta[property="og:title"]')?.setAttribute("content",title);const desc=p?`${p.name}${p.brand?" · "+p.brand:""}. ${availabilityLabel(p.availability||"order")}. QUATT QURYLYS, Атырау.`:"Строительные товары QUATT QURYLYS в Атырау.";document.querySelector('meta[name="description"]')?.setAttribute("content",desc);document.querySelector('meta[property="og:description"]')?.setAttribute("content",desc)}
function productLink(id){const u=new URL(location.href);u.searchParams.set("product",id);return u.toString()}
function openFromUrl(){const id=new URL(location.href).searchParams.get("product");if(id&&state.products.some(p=>p.id===id)&&!el.detailDialog.open)openDetail(id,false)}
function specsHtml(text){const o=parseSpecs(text);const entries=Object.entries(o);if(entries.length)return `<div class="spec-table">${entries.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div>`;return `<p class="spec-text">${esc(text||"Характеристики уточняются")}</p>`}
function renderVariants(p){const v=Array.isArray(p.variants)?p.variants:[];if(!v.length)return "";return `<section class="detail-section"><h3>Варианты</h3><div class="variant-list">${v.map(x=>`<div><span>${esc(x.name)}</span><strong>${x.price?money(x.price):"Уточнить"}</strong></div>`).join("")}</div></section>`}
function relatedProducts(p,type){let ids=type==="bundle"?(p.bundle_product_ids||[]):(p.related_product_ids||[]);const visible=x=>x&&(canViewInternal()||x.active!==false);let rows=ids.map(id=>state.products.find(x=>x.id===id)).filter(visible);if(!rows.length&&type==="related")rows=state.products.filter(x=>x.id!==p.id&&x.category_id===p.category_id&&visible(x)).slice(0,4);return rows.slice(0,6)}
async function recordView(id){
  // Внутренние просмотры администратора и снабженца не должны влиять на клиентскую аналитику.
  if(!isAdmin()&&!isProcurement()) supabase.from("product_view_events").insert({product_id:id}).then(()=>{});
  state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,20);
  saveLocal();
  renderLocalBadges();
}
function videoHtml(url){if(!url)return "";const u=String(url);const yt=u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{6,})/);if(yt)return `<section class="detail-section"><h3>Видео товара</h3><div class="video-wrap"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="Видео товара" allowfullscreen loading="lazy"></iframe></div></section>`;if(/\.(mp4|webm)(?:\?|$)/i.test(u))return `<section class="detail-section"><h3>Видео товара</h3><video class="product-video" src="${esc(u)}" controls playsinline></video></section>`;return `<p><a class="text-link" href="${esc(u)}" target="_blank" rel="noopener">▶ Смотреть видео товара</a></p>`}
function openDetail(id,pushUrl=true){
  const p=state.products.find(x=>x.id===id);if(!p||(!canViewInternal()&&p.active===false))return;recordView(id);updateSeo(p);if(pushUrl){const u=new URL(location.href);u.searchParams.set("product",id);history.replaceState(null,"",u)}
  el.detailTitle.textContent=p.name;el.detailSubtitle.textContent=`${catName(p.category_id)}${p.brand?" · "+p.brand:""}`;const pics=imgsFor(p.id);const sale=validSale(p);const similar=relatedProducts(p,"related"),bundle=relatedProducts(p,"bundle");
  const wa=`Здравствуйте! Пришёл с сайта QUATT QURYLYS. Хочу уточнить наличие / заказать: ${p.name}${p.brand?" ("+p.brand+")":""}.\n${productLink(p.id)}`;
  el.detailContent.innerHTML=`
    ${pics.length?`<div class="detail-photos">${pics.map((i,idx)=>`<button data-lightbox-index="${idx}"><img src="${publicUrl(i.image_path)}" alt="${esc(p.name)}"></button>`).join("")}</div>`:`<div class="detail-placeholder">Q</div>`}
    <div class="detail-buy-row"><div><div class="detail-price">${esc(priceText(p))}${sale?` <span class="old-price big">${money(p.old_price)}</span>`:""}</div><div class="availability-line">${esc(availabilityLabel(p.availability||"order"))}${p.delivery?` · ${esc(p.delivery)}`:""}</div>${sale&&p.sale_end?`<div class="sale-deadline detail-sale">${esc(saleInfo(p))}</div>`:""}</div><button id="detailWhatsapp" class="whatsapp-btn">WhatsApp</button></div>
    ${p.checked_date?`<p class="fine">Цена проверена: ${new Date(p.checked_date+"T00:00:00").toLocaleDateString("ru-RU")}</p>`:""}
    <section class="detail-section"><h3>Характеристики</h3>${specsHtml(p.specs)}</section>${renderVariants(p)}
    ${videoHtml(p.video_url)}
    <div class="detail-actions"><button id="detailCustomerAdd" class="primary">＋ В корзину</button><button id="shareProductBtn" class="small-btn">Поделиться</button><button id="qrProductBtn" class="small-btn">QR-код</button>${priv()?`<button id="printPriceBtn" class="small-btn">Печать ценника</button>`:""}</div>
    ${similar.length?`<section class="detail-section"><h3>Похожие товары</h3><div class="mini-grid">${similar.map(x=>productCard(x,true)).join("")}</div></section>`:""}
    ${bundle.length?`<section class="detail-section"><h3>С этим товаром покупают</h3><div class="mini-grid">${bundle.map(x=>productCard(x,true)).join("")}</div></section>`:""}
    ${priv()?`<section class="internal"><h3>✓ Внутренняя информация</h3><div class="stats"><div>Закуп<strong>${money(p.cost)}</strong></div><div>Маржа<strong>${money(Number(p.price)-Number(p.cost))}</strong></div><div>Маржа, %<strong>${Number(p.price)?(((Number(p.price)-Number(p.cost))/Number(p.price))*100).toFixed(1):0}%</strong></div></div><p><b>Поставщик:</b> ${esc(p.supplier||"Не указан")}</p><p>${esc(p.supplier_address||"")} ${esc(p.supplier_contact||"")}</p><p>${esc(p.notes||"")}</p><button class="primary" id="editFromDetail">✎ Редактировать</button></section>`:""}
    ${isSeller()?`<button class="primary cart-add" id="addToCartFromDetail">＋ Добавить в корзину продавца</button>`:""}`;
  el.detailDialog.showModal();
  el.detailContent.querySelectorAll("[data-lightbox-index]").forEach(b=>b.onclick=()=>openLightbox(pics.map(i=>publicUrl(i.image_path)),Number(b.dataset.lightboxIndex)));
  bindProductCards(el.detailContent);$("detailWhatsapp").onclick=()=>openWhatsapp(wa);$("detailCustomerAdd").onclick=()=>addCustomerCart(p.id);
  $("shareProductBtn").onclick=()=>shareProduct(p);$("qrProductBtn").onclick=()=>showQR(p);const pr=$("printPriceBtn");if(pr)pr.onclick=()=>printPrice(p);const edit=$("editFromDetail");if(edit)edit.onclick=()=>{el.detailDialog.close();openProduct(p)};const add=$("addToCartFromDetail");if(add)add.onclick=()=>{addToCart(p.id);toast("Добавлено в корзину продавца")};
}
el.detailDialog.addEventListener("close",()=>{const u=new URL(location.href);u.searchParams.delete("product");history.replaceState(null,"",u);updateSeo()});
async function shareProduct(p){const data={title:p.name,text:`${p.name} — ${priceText(p)}`,url:productLink(p.id)};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(data.url);toast("Ссылка скопирована")}}catch{}}
function showQR(p){const url=productLink(p.id);const qr=`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(url)}`;const w=window.open("","_blank");if(w){try{w.opener=null}catch{}w.document.write(`<title>QR — ${esc(p.name)}</title><body style="font-family:Arial;text-align:center;padding:30px"><h2>${esc(p.name)}</h2><img src="${qr}" width="320" height="320"><p>${esc(url)}</p><p><a href="${qr}" download="QUATT-QR.png">Сохранить QR</a></p></body>`)} }
function printPrice(p){openPriceTagStudio([p.id])}

function openLightbox(images,index=0){if(!images.length)return;state.lightbox.images=images;state.lightbox.index=index;resetZoom();renderLightbox();el.lightboxDialog.showModal()}
function renderLightbox(){const l=state.lightbox;el.lightboxImage.src=l.images[l.index];el.lightboxCounter.textContent=`${l.index+1} / ${l.images.length}`;applyZoom()}
function resetZoom(){Object.assign(state.lightbox,{scale:1,x:0,y:0,lastDist:0});applyZoom()}
function clampZoomPan(){const l=state.lightbox,img=el.lightboxImage,stage=el.lightboxStage;if(!img||!stage)return;if(l.scale<=1){l.x=0;l.y=0;return}const baseW=img.clientWidth||0,baseH=img.clientHeight||0,stageW=stage.clientWidth||0,stageH=stage.clientHeight||0;const maxX=Math.max(0,(baseW*l.scale-stageW)/2),maxY=Math.max(0,(baseH*l.scale-stageH)/2);l.x=Math.max(-maxX,Math.min(maxX,l.x));l.y=Math.max(-maxY,Math.min(maxY,l.y))}
function applyZoom(){const l=state.lightbox;clampZoomPan();if(el.lightboxImage)el.lightboxImage.style.transform=`translate(${l.x}px,${l.y}px) scale(${l.scale})`;if(el.zoomResetBtn)el.zoomResetBtn.textContent=`${Math.round(l.scale*100)}%`}
function zoomBy(delta){state.lightbox.scale=Math.max(1,Math.min(5,state.lightbox.scale+delta));if(state.lightbox.scale===1){state.lightbox.x=0;state.lightbox.y=0}applyZoom()}
function stepLightbox(d){const l=state.lightbox;l.index=(l.index+d+l.images.length)%l.images.length;resetZoom();renderLightbox()}
el.lightboxClose.onclick=()=>el.lightboxDialog.close();el.lightboxPrev.onclick=()=>stepLightbox(-1);el.lightboxNext.onclick=()=>stepLightbox(1);el.zoomInBtn.onclick=()=>zoomBy(.4);el.zoomOutBtn.onclick=()=>zoomBy(-.4);el.zoomResetBtn.onclick=resetZoom;el.lightboxStage.addEventListener("wheel",e=>{e.preventDefault();zoomBy(e.deltaY<0?.25:-.25)},{passive:false});
el.lightboxStage.addEventListener("pointerdown",e=>{el.lightboxStage.setPointerCapture(e.pointerId);state.lightbox.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})});
el.lightboxStage.addEventListener("pointermove",e=>{const l=state.lightbox;if(!l.pointers.has(e.pointerId))return;const prev=l.pointers.get(e.pointerId);l.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const pts=[...l.pointers.values()];if(pts.length===1&&l.scale>1){l.x+=e.clientX-prev.x;l.y+=e.clientY-prev.y;applyZoom()}else if(pts.length===2){const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(l.lastDist)l.scale=Math.max(1,Math.min(5,l.scale*dist/l.lastDist));l.lastDist=dist;applyZoom()}});
function endPointer(e){state.lightbox.pointers.delete(e.pointerId);if(state.lightbox.pointers.size<2)state.lightbox.lastDist=0}el.lightboxStage.addEventListener("pointerup",endPointer);el.lightboxStage.addEventListener("pointercancel",endPointer);el.lightboxStage.ondblclick=()=>state.lightbox.scale>1?resetZoom():zoomBy(1);

function autoKeywords(){const c=catName(el.fCategory.value);const specs=Object.values(parseSpecs(el.fSpecs.value));return uniq([el.fName.value,el.fBrand.value,c,...specs].flatMap(x=>String(x||"").split(/[\s,;/]+/)).map(x=>x.trim()).filter(x=>x.length>1)).join(", ")}
function parseVariantsInput(text){return String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{const [name,price]=line.split("|").map(x=>x.trim());return {name,price:Number(price)||null}}).filter(x=>x.name)}
function variantsToText(v){return Array.isArray(v)?v.map(x=>`${x.name}${x.price?" | "+x.price:""}`).join("\n"):""}
function selectedValues(sel){return [...sel.selectedOptions].map(o=>o.value).filter(Boolean)}
function setSelectedValues(sel,vals=[]){[...sel.options].forEach(o=>o.selected=vals.includes(o.value))}
function renderRelationOptions(currentId=""){const opts=state.products.filter(p=>p.id!==currentId).sort((a,b)=>a.name.localeCompare(b.name,"ru")).map(p=>`<option value="${p.id}">${esc(p.name)}${p.brand?" · "+esc(p.brand):""}</option>`).join("");el.fRelated.innerHTML=opts;el.fBundle.innerHTML=opts}
function resetProductForm(){state.editing=null;state.formImages=[];el.productForm.reset();el.productId.value="";el.productDialogTitle.textContent="Новый товар";el.fDelivery.value="1 день";el.fCheckedDate.value=new Date().toISOString().slice(0,10);el.fActive.checked=true;el.fAvailability.value="order";el.fPriceMode.value="show";if(state.cat!=="all")el.fCategory.value=state.cat;else if(state.categories[0])el.fCategory.value=state.categories[0].id;el.deleteProductBtn.classList.add("hidden");el.productHistoryBtn.classList.add("hidden");renderRelationOptions();renderBadgePreview();renderFormImages();updateMargin()}
function openProduct(p=null){if(!canEditProducts())return;resetProductForm();if(p){state.editing=p;state.formImages=imgsFor(p.id).map(i=>({...i}));el.productDialogTitle.textContent="Редактировать товар";el.productId.value=p.id;el.fName.value=p.name||"";el.fCategory.value=p.category_id||"";el.fBrand.value=p.brand||"";el.fPrice.value=p.price??"";el.fPriceMode.value=p.price_mode||"show";el.fAvailability.value=p.availability||"order";el.fBadge.value=p.badge||"";el.fDelivery.value=p.delivery||"";el.fOldPrice.value=p.old_price??"";el.fSaleEnd.value=p.sale_end||"";el.fSpecs.value=p.specs||"";el.fVariants.value=variantsToText(p.variants);el.fVideoUrl.value=p.video_url||"";el.fCost.value=p.cost??"";el.fSupplier.value=p.supplier||"";el.fSupplierAddress.value=p.supplier_address||"";el.fSupplierContact.value=p.supplier_contact||"";el.fCheckedDate.value=p.checked_date||"";el.fNotes.value=p.notes||"";el.fActive.checked=p.active!==false;renderRelationOptions(p.id);setSelectedValues(el.fRelated,p.related_product_ids||[]);setSelectedValues(el.fBundle,p.bundle_product_ids||[]);el.deleteProductBtn.classList.toggle("hidden",!isAdmin());el.productHistoryBtn.classList.remove("hidden")}renderFormImages();updateMargin();renderBadgePreview();el.productDialog.showModal()}
function renderFormImages(){el.photoThumbs.innerHTML=state.formImages.map((i,idx)=>`<div class="thumb"><img src="${i.preview||publicUrl(i.image_path)}" alt=""><button type="button" data-rm="${idx}">Удалить</button></div>`).join("");el.photoThumbs.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{state.formImages.splice(Number(b.dataset.rm),1);renderFormImages()})}
function updateMargin(){el.marginInfo.textContent="Маржа: "+money(Number(el.fPrice.value||0)-Number(el.fCost.value||0))}
function renderBadgePreview(){const v=el.fBadge.value;if(!v){el.badgePreview.innerHTML="";return}el.badgePreview.innerHTML=`<span class="product-badge badge-${norm(v)}" style="position:static">${esc(v)}</span>`}
function roundRetail(v){return Math.ceil(Number(v||0)/100)*100}
function applyMarkup(n){el.fPrice.value=roundRetail(Number(el.fCost.value||0)*(1+Number(n)/100));updateMargin()}
document.querySelectorAll("[data-markup]").forEach(b=>b.onclick=()=>applyMarkup(b.dataset.markup));el.fBadge.onchange=renderBadgePreview;el.applyManualMarkup.onclick=()=>{const n=Number(el.manualMarkup.value);if(!Number.isFinite(n)||n<0)return toast("Укажи корректный процент",true);applyMarkup(n)};el.fCost.oninput=updateMargin;el.fPrice.oninput=updateMargin;
async function compressImage(file){if(file.size>20*1024*1024)throw new Error(`${file.name}: больше 20 МБ`);if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error(`${file.name}: нужен JPG, PNG или WebP`);const bmp=await createImageBitmap(file);const max=2500;const scale=Math.min(1,max/Math.max(bmp.width,bmp.height));const c=document.createElement("canvas");c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);bmp.close();const blob=await new Promise(r=>c.toBlob(r,"image/webp",.86));return new File([blob||file],file.name.replace(/\.[^.]+$/,"")+".webp",{type:"image/webp"})}
el.photoInput.onchange=async()=>{const files=[...el.photoInput.files||[]];if(state.formImages.length+files.length>5){toast("Можно добавить до 5 фото",true);el.photoInput.value="";return}for(const f of files){try{const compact=await compressImage(f);state.formImages.push({file:compact,preview:URL.createObjectURL(compact)})}catch(e){toast(e.message,true)}}el.photoInput.value="";renderFormImages()};
async function uploadNewImages(productId){let order=0;const kept=[];for(const item of state.formImages){if(item.id){kept.push(item);order++;continue}const path=`${productId}/${crypto.randomUUID()}.webp`;const up=await supabase.storage.from(STORAGE_BUCKET).upload(path,item.file,{cacheControl:"3600",upsert:false,contentType:"image/webp"});if(up.error)throw up.error;const ins=await supabase.from("product_images").insert({product_id:productId,image_path:path,sort_order:order}).select().single();if(ins.error)throw ins.error;kept.push(ins.data);order++}return kept}
async function syncRemovedImages(productId){const before=imgsFor(productId),keptIds=new Set(state.formImages.filter(i=>i.id).map(i=>i.id));const removed=before.filter(i=>!keptIds.has(i.id));if(!removed.length)return;await supabase.storage.from(STORAGE_BUCKET).remove(removed.map(i=>i.image_path));for(const i of removed){const r=await supabase.from("product_images").delete().eq("id",i.id);if(r.error)throw r.error}}
function findDuplicate(name,brand,id){const n=norm(name),b=norm(brand);return state.products.find(p=>p.id!==id&&norm(p.name)===n&&(!b||norm(p.brand)===b))}
el.productForm.onsubmit=async e=>{e.preventDefault();if(!canEditProducts())return;const id=el.productId.value||crypto.randomUUID();const dup=findDuplicate(el.fName.value,el.fBrand.value,id);if(dup&&!confirm(`Похожий товар уже есть: «${dup.name}». Всё равно сохранить?`))return;const cost=Number(el.fCost.value||0),price=Number(el.fPrice.value||0),markup=cost?((price/cost)-1)*100:0;const payload={id,name:el.fName.value.trim(),category_id:el.fCategory.value||null,brand:el.fBrand.value.trim()||null,price,cost,markup,delivery:el.fDelivery.value.trim()||null,specs:el.fSpecs.value.trim()||null,keywords:autoKeywords(),supplier:el.fSupplier.value.trim()||null,supplier_address:el.fSupplierAddress.value.trim()||null,supplier_contact:el.fSupplierContact.value.trim()||null,checked_date:el.fCheckedDate.value||null,notes:el.fNotes.value.trim()||null,active:el.fActive.checked,availability:el.fAvailability.value,badge:el.fBadge.value||null,price_mode:el.fPriceMode.value,old_price:el.fOldPrice.value?Number(el.fOldPrice.value):null,sale_end:el.fSaleEnd.value||null,video_url:el.fVideoUrl.value.trim()||null,variants:parseVariantsInput(el.fVariants.value),related_product_ids:selectedValues(el.fRelated),bundle_product_ids:selectedValues(el.fBundle)};const before=state.editing?{...state.editing}:null;const beforePhotos=before?imgsFor(id).length:0;try{const r=el.productId.value?await supabase.from("products").update(payload).eq("id",id):await supabase.from("products").insert(payload);if(r.error)throw r.error;await syncRemovedImages(id);await uploadNewImages(id);const afterPhotos=state.formImages.length;await logProductChange(id,payload.name,before?"update":"create",buildProductChanges(before,payload,beforePhotos,afterPhotos));el.productDialog.close();toast("Товар сохранён");await loadData()}catch(err){console.error(err);toast(err.message||String(err),true)}};
el.deleteProductBtn.onclick=async()=>{const id=el.productId.value;if(!isAdmin()||!id||!confirm("Удалить товар полностью?"))return;try{const p=state.products.find(x=>x.id===id);await logProductChange(id,p?.name||"Товар","delete",[{field:"Товар",from:p?.name||"",to:"Удалён"}]);const imgs=imgsFor(id);if(imgs.length)await supabase.storage.from(STORAGE_BUCKET).remove(imgs.map(i=>i.image_path));const r=await supabase.from("products").delete().eq("id",id);if(r.error)throw r.error;el.productDialog.close();toast("Товар удалён");await loadData()}catch(e){toast(e.message||String(e),true)}};

const productFieldLabels={name:"Название",category_id:"Категория",brand:"Бренд",price:"Розничная цена",cost:"Закупочная цена",delivery:"Срок поставки",specs:"Характеристики",supplier:"Поставщик",supplier_address:"Адрес поставщика",supplier_contact:"Контакт поставщика",checked_date:"Дата проверки",notes:"Внутренние заметки",active:"Показывать в каталоге",availability:"Наличие",badge:"Метка",price_mode:"Отображение цены",old_price:"Старая цена",sale_end:"Акция до",video_url:"Видео"};
function historyValue(k,v){if(k==="category_id")return catName(v);if(k==="price"||k==="cost"||k==="old_price")return v==null||v===""?"":money(v);if(k==="active")return v?"Да":"Нет";if(Array.isArray(v))return JSON.stringify(v);if(v&&typeof v==="object")return JSON.stringify(v);return String(v??"")}
function buildProductChanges(before,after,beforePhotos=0,afterPhotos=0){if(!before)return [{field:"Товар",from:"",to:"Создан"},{field:"Фото",from:"0",to:String(afterPhotos)}];const rows=[];for(const [k,label] of Object.entries(productFieldLabels)){const a=historyValue(k,before[k]),b=historyValue(k,after[k]);if(a!==b)rows.push({field:label,from:a,to:b})}if(beforePhotos!==afterPhotos)rows.push({field:"Фото",from:String(beforePhotos),to:String(afterPhotos)});return rows}
async function logProductChange(productId,productName,action,changes){if(!changes?.length)return;const r=await supabase.from("product_change_history").insert({product_id:productId,product_name:productName,action,changes,changed_by_email:state.email,changed_by_name:roleLabel(state.role),changed_by_role:state.role});if(r.error)console.warn("История товара:",r.error)}
async function openProductHistory(productId,productName){if(!canViewInternal())return;el.productHistorySub.textContent=productName;el.productHistoryList.innerHTML="Загрузка…";el.productHistoryDialog.showModal();const r=await supabase.from("product_change_history").select("*").eq("product_id",productId).order("created_at",{ascending:false});if(r.error){el.productHistoryList.innerHTML=`<p class="error-text">${esc(r.error.message)}</p>`;return}const rows=r.data||[];el.productHistoryList.innerHTML=rows.length?rows.map(h=>`<div class="product-history-entry"><div class="history-entry-head"><b>${esc(h.changed_by_name||roleLabel(h.changed_by_role))}</b><span>${new Date(h.created_at).toLocaleString("ru-RU")}</span></div><div class="fine">${esc(h.changed_by_email||"")}</div>${(h.changes||[]).map(c=>`<div class="history-change"><strong>${esc(c.field)}</strong><span>${esc(c.from||"—")} → ${esc(c.to||"—")}</span></div>`).join("")}</div>`).join(""):`<p class="fine">Истории пока нет.</p>`}
el.productHistoryBtn.onclick=()=>{const id=el.productId.value,p=state.products.find(x=>x.id===id);if(id)openProductHistory(id,p?.name||el.fName.value)};

async function addCategory(name,selectAfter=false){name=name.trim();if(!name)return null;const exists=state.categories.find(c=>c.name.toLowerCase()===name.toLowerCase());if(exists){if(selectAfter)el.fCategory.value=exists.id;return exists}const maxSort=Math.max(0,...state.categories.map(c=>c.sort_order||0));const r=await supabase.from("categories").insert({name,sort_order:maxSort+10,active:true}).select().single();if(r.error)throw r.error;await loadData();if(selectAfter)el.fCategory.value=r.data.id;return r.data}
el.addCategoryInFormBtn.onclick=async()=>{try{const c=await addCategory(el.newCategoryInForm.value,true);if(c){el.newCategoryInForm.value="";toast("Категория добавлена")}}catch(e){toast(e.message||String(e),true)}};
async function openManage(){if(!isAdmin()||!internalMode())return;el.staffSection.classList.toggle("hidden",!canManageRoles());el.sellerNamesSection.classList.toggle("hidden",!canManageRoles());el.manageDialog.showModal();const jobs=[renderCategoryManager(),renderBannerManager()];if(canManageRoles())jobs.push(loadStaff(),renderSellerNamesManager());await Promise.all(jobs)}
async function loadStaff(){const r=await supabase.from("staff_roles").select("*").order("email");if(r.error)return toast(r.error.message,true);state.staff=r.data||[];el.staffList.innerHTML=state.staff.map(s=>`<div class="member"><span>${esc(s.email)}</span><span>${roleLabel(s.role)}</span><span class="actions"><button class="small-btn" data-staff-del="${esc(s.email)}">Удалить</button></span></div>`).join("");el.staffList.querySelectorAll("[data-staff-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Удалить доступ сотрудника?"))return;const r=await supabase.from("staff_roles").delete().eq("email",b.dataset.staffDel);if(r.error)toast(r.error.message,true);else{toast("Доступ удалён");loadStaff()}})}
el.staffForm.onsubmit=async e=>{e.preventDefault();const r=await supabase.from("staff_roles").upsert({email:el.staffEmail.value.trim().toLowerCase(),role:el.staffRole.value},{onConflict:"email"});if(r.error)return toast(r.error.message,true);el.staffEmail.value="";toast("Доступ сохранён");loadStaff()};
async function renderSellerNamesManager(){const rows=state.sellerNames||[];el.sellerNamesList.innerHTML=rows.length?rows.map(x=>`<div class="seller-name-row"><input data-seller-name="${x.id}" value="${esc(x.name)}"><label class="inline-check"><input type="checkbox" data-seller-active="${x.id}" ${x.active!==false?"checked":""}> Активен</label><div class="actions"><button class="small-btn" data-seller-save="${x.id}">Сохранить</button><button class="small-btn danger-lite" data-seller-del="${x.id}">Удалить</button></div></div>`).join(""):`<p class="fine">Имена ещё не добавлены.</p>`;el.sellerNamesList.querySelectorAll("[data-seller-save]").forEach(b=>b.onclick=async()=>{const id=b.dataset.sellerSave,name=el.sellerNamesList.querySelector(`[data-seller-name="${id}"]`).value.trim(),active=el.sellerNamesList.querySelector(`[data-seller-active="${id}"]`).checked;if(!name)return toast("Укажите имя продавца",true);const r=await supabase.from("seller_names").update({name,active}).eq("id",id);if(r.error)return toast(r.error.message,true);toast("Имя сохранено");await loadData();renderSellerNamesManager()});el.sellerNamesList.querySelectorAll("[data-seller-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Удалить имя? Старые заказы останутся."))return;const r=await supabase.from("seller_names").delete().eq("id",b.dataset.sellerDel);if(r.error)return toast(r.error.message,true);toast("Имя удалено");await loadData();renderSellerNamesManager()})}
el.sellerNameForm.onsubmit=async e=>{e.preventDefault();const name=el.newSellerName.value.trim();if(!name)return;const maxSort=Math.max(0,...state.sellerNames.map(x=>x.sort_order||0));const r=await supabase.from("seller_names").insert({name,sort_order:maxSort+10,active:true});if(r.error)return toast(r.error.message,true);el.newSellerName.value="";toast("Продавец добавлен");await loadData();renderSellerNamesManager()};
function renderCategoryManager(){el.categoryManager.innerHTML=state.categories.map(c=>`<div class="category-row"><span>${esc(c.name)} ${c.active?"":"(скрыта)"}</span><span class="actions"><button class="small-btn" data-cat-toggle="${c.id}">${c.active?"Скрыть":"Показать"}</button><button class="small-btn" data-cat-del="${c.id}">Удалить</button></span></div>`).join("");el.categoryManager.querySelectorAll("[data-cat-toggle]").forEach(b=>b.onclick=async()=>{const c=state.categories.find(x=>x.id===b.dataset.catToggle);const r=await supabase.from("categories").update({active:!c.active}).eq("id",c.id);if(r.error)toast(r.error.message,true);else{await loadData();renderCategoryManager()}});el.categoryManager.querySelectorAll("[data-cat-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Удалить категорию? У товаров категория станет пустой."))return;const r=await supabase.from("categories").delete().eq("id",b.dataset.catDel);if(r.error)toast(r.error.message,true);else{await loadData();renderCategoryManager()}})}
el.categoryForm.onsubmit=async e=>{e.preventDefault();try{await addCategory(el.newCategoryName.value);el.newCategoryName.value="";toast("Категория добавлена");renderCategoryManager()}catch(e){toast(e.message||String(e),true)}};
async function renderBannerManager(){el.bannerManager.innerHTML=state.banners.map(b=>`<div class="category-row"><span><b>${esc(b.title)}</b>${b.subtitle?` — ${esc(b.subtitle)}`:""}</span><span class="actions"><button class="small-btn" data-banner-toggle="${b.id}">${b.active?"Скрыть":"Показать"}</button><button class="small-btn danger-lite" data-banner-del="${b.id}">Удалить</button></span></div>`).join("");el.bannerManager.querySelectorAll("[data-banner-toggle]").forEach(b=>b.onclick=async()=>{const row=state.banners.find(x=>x.id===b.dataset.bannerToggle);const r=await supabase.from("site_banners").update({active:!row.active}).eq("id",row.id);if(r.error)return toast(r.error.message,true);await loadData();renderBannerManager()});el.bannerManager.querySelectorAll("[data-banner-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Удалить баннер?"))return;const r=await supabase.from("site_banners").delete().eq("id",b.dataset.bannerDel);if(r.error)return toast(r.error.message,true);await loadData();renderBannerManager()})}
el.bannerForm.onsubmit=async e=>{e.preventDefault();const r=await supabase.from("site_banners").insert({title:el.bannerTitle.value.trim(),subtitle:el.bannerSubtitle.value.trim()||null,category_id:el.bannerCategory.value||null,sort_order:(state.banners.length+1)*10});if(r.error)return toast(r.error.message,true);el.bannerForm.reset();toast("Баннер добавлен");await loadData();renderBannerManager()};

function renderLocalBadges(){el.favoritesBadge.textContent=state.favorites.length;el.favoritesBadge.classList.toggle("hidden",!state.favorites.length);const n=state.customerCart.reduce((a,x)=>a+x.qty,0);el.customerCartBadge.textContent=n;el.customerCartBadge.classList.toggle("hidden",!n)}
function toggleFavorite(id){state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];saveLocal();renderLocalBadges();renderProducts();if(el.favoritesDialog.open)renderFavorites()}
function renderFavorites(){const rows=state.favorites.map(id=>state.products.find(p=>p.id===id)).filter(p=>p&&(canViewInternal()||p.active!==false));el.favoritesList.innerHTML=rows.length?rows.map(p=>productCard(p,true)).join(""):`<div class="empty compact-empty"><h2>Пока пусто</h2><p>Нажмите ♡ на нужных товарах.</p></div>`;bindProductCards(el.favoritesList)}
function addCustomerCart(id){const p=state.products.find(x=>x.id===id);if(!p)return;const row=state.customerCart.find(x=>x.product_id===id);if(row)row.qty++;else state.customerCart.push({product_id:id,name:p.name,price:Number(p.price||0),qty:1});saveLocal();renderLocalBadges();toast("Добавлено в корзину")}
function renderCustomerCart(){if(!state.customerCart.length){el.customerCartItems.innerHTML=`<div class="empty compact-empty"><h2>Корзина пуста</h2><p>Добавьте товары из каталога.</p></div>`;el.customerCartTotal.textContent="";el.sendCustomerCartBtn.disabled=true;return}el.sendCustomerCartBtn.disabled=false;el.customerCartItems.innerHTML=state.customerCart.map(x=>`<div class="cart-item"><div></div><div><b>${esc(x.name)}</b><div class="fine">${money(x.price)} × ${x.qty}</div></div><div class="qty"><button data-cminus="${x.product_id}">−</button><span>${x.qty}</span><button data-cplus="${x.product_id}">+</button></div><button class="small-btn" data-cremove="${x.product_id}">Удалить</button></div>`).join("");el.customerCartTotal.textContent=`Итого: ${money(state.customerCart.reduce((a,x)=>a+x.price*x.qty,0))}`;el.customerCartItems.querySelectorAll("[data-cminus]").forEach(b=>b.onclick=()=>changeCustomerQty(b.dataset.cminus,-1));el.customerCartItems.querySelectorAll("[data-cplus]").forEach(b=>b.onclick=()=>changeCustomerQty(b.dataset.cplus,1));el.customerCartItems.querySelectorAll("[data-cremove]").forEach(b=>b.onclick=()=>{state.customerCart=state.customerCart.filter(x=>x.product_id!==b.dataset.cremove);saveLocal();renderLocalBadges();renderCustomerCart()})}
function changeCustomerQty(id,d){const r=state.customerCart.find(x=>x.product_id===id);if(!r)return;r.qty+=d;if(r.qty<=0)state.customerCart=state.customerCart.filter(x=>x.product_id!==id);saveLocal();renderLocalBadges();renderCustomerCart()}
function sendCustomerCart(){const lines=state.customerCart.map((x,i)=>`${i+1}. ${x.name} — ${x.qty} шт. × ${money(x.price)}`);openWhatsapp(`Здравствуйте! Пришёл с сайта QUATT QURYLYS. Хочу уточнить/заказать:\n\n${lines.join("\n")}\n\nОриентировочная сумма: ${money(state.customerCart.reduce((a,x)=>a+x.price*x.qty,0))}`)}

function requireSeller(){if(!isSeller())return false;if(!state.selectedSellerId){toast("Сначала выберите своё имя",true);return false}return true}
function cartKey(){return `quatt-cart:${state.email||"guest"}:${state.selectedSellerId||"none"}`}
function loadCart(){if(!isSeller()||!state.selectedSellerId){state.cart=[];renderCartBadge();return}try{state.cart=JSON.parse(localStorage.getItem(cartKey())||"[]")}catch{state.cart=[]}renderCartBadge()}
function saveCart(){if(isSeller()&&state.selectedSellerId)localStorage.setItem(cartKey(),JSON.stringify(state.cart));renderCartBadge()}
function renderCartBadge(){const n=state.cart.reduce((a,x)=>a+Number(x.qty||0),0);el.cartBadge.textContent=n;el.cartBadge.classList.toggle("hidden",n===0)}
function addToCart(productId){if(!requireSeller())return;const p=state.products.find(x=>x.id===productId);if(!p)return;const row=state.cart.find(x=>x.product_id===productId);if(row)row.qty++;else state.cart.push({product_id:p.id,name:p.name,price:Number(p.price||0),qty:1});saveCart()}
function changeQty(productId,delta){const row=state.cart.find(x=>x.product_id===productId);if(!row)return;row.qty+=delta;if(row.qty<=0)state.cart=state.cart.filter(x=>x.product_id!==productId);saveCart();renderCart()}
function renderCart(){const seller=selectedSeller();if(!seller){el.cartItems.innerHTML='<div class="empty compact-empty"><h2>Выберите продавца</h2></div>';el.cartTotal.textContent="";el.checkoutBtn.disabled=true;return}if(!state.cart.length){el.cartItems.innerHTML=`<div class="empty compact-empty"><h2>Корзина ${esc(seller.name)} пуста</h2></div>`;el.cartTotal.textContent="";el.checkoutBtn.disabled=true;return}el.checkoutBtn.disabled=false;el.cartItems.innerHTML=state.cart.map(x=>{const cover=imgsFor(x.product_id)[0];return `<div class="cart-item">${cover?`<img src="${publicUrl(cover.image_path)}" alt="">`:`<div></div>`}<div><b>${esc(x.name)}</b><div class="fine">${money(x.price)} × ${x.qty}</div></div><div class="qty"><button data-minus="${x.product_id}">−</button><span>${x.qty}</span><button data-plus="${x.product_id}">+</button></div><button class="small-btn" data-remove="${x.product_id}">Удалить</button></div>`}).join("");el.cartTotal.textContent=`Итого: ${money(state.cart.reduce((a,x)=>a+Number(x.price)*Number(x.qty),0))}`;el.cartItems.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>changeQty(b.dataset.minus,-1));el.cartItems.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>changeQty(b.dataset.plus,1));el.cartItems.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{state.cart=state.cart.filter(x=>x.product_id!==b.dataset.remove);saveCart();renderCart()})}
function resetCheckoutForm(){el.checkoutForm.reset();el.initialStatus.value="interest"}
async function addHistory(orderId,fromStatus,toStatus,actorName){const r=await supabase.from("order_status_history").insert({order_id:orderId,from_status:fromStatus,to_status:toStatus,changed_by_email:state.email,changed_by_name:actorName});if(r.error)throw r.error}
async function createOrder(){if(!state.cart.length||!requireSeller())return;const seller=selectedSeller();const total=state.cart.reduce((a,x)=>a+Number(x.price)*Number(x.qty),0);const payload={seller_email:state.email,seller_name_id:seller.id,seller_name:seller.name,client_name:el.clientName.value.trim(),client_phone:el.clientPhone.value.trim()||null,note:el.orderNote.value.trim()||null,status:el.initialStatus.value,total_amount:total};const r=await supabase.from("orders").insert(payload).select().single();if(r.error)throw r.error;const items=state.cart.map(x=>({order_id:r.data.id,product_id:x.product_id,product_name:x.name,unit_price:x.price,quantity:x.qty,line_total:x.price*x.qty}));const ir=await supabase.from("order_items").insert(items);if(ir.error)throw ir.error;await addHistory(r.data.id,null,r.data.status,seller.name);state.cart=[];saveCart();resetCheckoutForm();return r.data}
const activeStatuses=new Set(["interest","paid","ordered","arrived"]);const statusLabels={interest:"Интересуется",paid:"Оплачено",ordered:"Заказан у поставщика",arrived:"Прибыл",issued:"Выдан",cancelled:"Отменён"};function statusLabel(s){return statusLabels[s]||s}function orderInTab(o,tab){return tab==="active"?activeStatuses.has(o.status):tab==="completed"?o.status==="issued":o.status==="cancelled"}
async function loadOrders(adminMode=false){let q=supabase.from("orders").select("*,order_items(*),order_status_history(*)").order("created_at",{ascending:false});if(!adminMode){if(!requireSeller())return[];q=q.eq("seller_email",state.email).eq("seller_name_id",state.selectedSellerId)}const r=await q;if(r.error)throw r.error;state.orders=r.data||[];return state.orders}
function historyHtml(o){const rows=[...(o.order_status_history||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));return rows.length?`<div class="status-history">${rows.map(h=>`<div><time>${new Date(h.created_at).toLocaleString("ru-RU")}</time><span>${h.from_status?esc(statusLabel(h.from_status))+" → ":""}<b>${esc(statusLabel(h.to_status))}</b></span><em>${esc(h.changed_by_name||h.changed_by_email||"")}</em></div>`).join("")}</div>`:`<p class="fine">Истории пока нет.</p>`}
async function changeOrderStatus(orderId,newStatus,actorName){const order=state.orders.find(x=>x.id===orderId);if(!order)return;const from=order.status;const r=await supabase.from("orders").update({status:newStatus}).eq("id",orderId);if(r.error)throw r.error;await addHistory(orderId,from,newStatus,actorName)}
async function deleteOrder(orderId,orderNumber){if(!isAdmin()||!confirm(`Удалить заказ №${orderNumber}? Это действие нельзя отменить.`))return;const r=await supabase.from("orders").delete().eq("id",orderId);if(r.error)return toast(r.error.message,true);toast("Заказ удалён");await openOrders(true,false);refreshOrdersBadge(false)}
function renderOrders(list,adminMode){const filtered=list.filter(o=>orderInTab(o,state.orderTab));el.ordersList.innerHTML=filtered.length?filtered.map(o=>{const paidClass=o.status==="paid"?" paid-order":"";let actions="";if(adminMode&&canManageOrders()){actions+=`<select class="choice order-status" data-order-status="${o.id}">${Object.entries(statusLabels).map(([v,l])=>`<option value="${v}" ${o.status===v?"selected":""}>${l}</option>`).join("")}</select>${isAdmin()?`<button class="small-btn danger-lite" data-order-delete="${o.id}" data-order-number="${o.order_number}">Удалить заказ</button>`:""}`}else if(!adminMode){if(o.status==="interest")actions+=`<button class="primary mini" data-seller-status="paid" data-order-id="${o.id}">Отметить оплачено</button>`;if(o.status==="cancelled")actions+=`<button class="primary mini" data-seller-status="interest" data-order-id="${o.id}">Возобновить заказ</button>`;else if(activeStatuses.has(o.status))actions+=`<button class="small-btn danger-lite" data-seller-status="cancelled" data-order-id="${o.id}">Отменить</button>`}return `<div class="order-card${paidClass}"><div class="order-head"><div><strong>Заказ №${esc(o.order_number||"")}</strong><div class="order-meta">${new Date(o.created_at).toLocaleString("ru-RU")} · ${esc(o.seller_name||"Продавец")}</div></div><div class="order-total">${money(o.total_amount)}</div></div>${o.status==="paid"?'<div class="paid-banner">✓ ОПЛАЧЕНО — требуется обработка</div>':""}<p><b>Клиент:</b> ${esc(o.client_name||"")} ${esc(o.client_phone||"")}</p>${o.note?`<p>${esc(o.note)}</p>`:""}<div class="order-items">${(o.order_items||[]).map(i=>`${esc(i.product_name)} — ${i.quantity} × ${money(i.unit_price)} = ${money(i.line_total)}`).join("<br>")}</div><div class="order-actions">${actions||`<span class="status-pill">${statusLabel(o.status)}</span>`}<button class="small-btn" data-history-toggle="${o.id}">История статусов</button></div><div class="history-wrap hidden" data-history="${o.id}">${historyHtml(o)}</div></div>`}).join(""):`<div class="empty compact-empty"><h2>Здесь пока пусто</h2></div>`;el.ordersList.querySelectorAll("[data-history-toggle]").forEach(b=>b.onclick=()=>el.ordersList.querySelector(`[data-history="${b.dataset.historyToggle}"]`).classList.toggle("hidden"));if(adminMode){el.ordersList.querySelectorAll("[data-order-status]").forEach(s=>s.onchange=async()=>{try{await changeOrderStatus(s.dataset.orderStatus,s.value,roleLabel(state.role));toast("Статус обновлён");await openOrders(true,false);await refreshOrdersBadge(false)}catch(e){toast(e.message||String(e),true)}});el.ordersList.querySelectorAll("[data-order-delete]").forEach(b=>b.onclick=()=>deleteOrder(b.dataset.orderDelete,b.dataset.orderNumber))}else el.ordersList.querySelectorAll("[data-seller-status]").forEach(b=>b.onclick=async()=>{try{const seller=selectedSeller();await changeOrderStatus(b.dataset.orderId,b.dataset.sellerStatus,seller?.name||"Продавец");toast(b.dataset.sellerStatus==="paid"?"Заказ отмечен как оплаченный":b.dataset.sellerStatus==="cancelled"?"Заказ отменён":"Заказ возобновлён");await openOrders(false,false)}catch(e){toast(e.message||String(e),true)}})}
async function openOrders(adminMode,show=true){try{const rows=await loadOrders(adminMode);el.ordersDialog.dataset.adminMode=adminMode?"1":"0";el.ordersDialogTitle.textContent=adminMode?"Заказы":"Мои заказы";el.ordersDialogSub.textContent=adminMode?"Все заказы продавцов.":`Заказы продавца: ${selectedSeller()?.name||"не выбран"}.`;renderOrderTabs();renderOrders(rows,adminMode);if(show)el.ordersDialog.showModal()}catch(e){toast(e.message||String(e),true)}}
function renderOrderTabs(){el.orderTabs.querySelectorAll("[data-order-tab]").forEach(b=>b.classList.toggle("active",b.dataset.orderTab===state.orderTab))}
el.orderTabs.querySelectorAll("[data-order-tab]").forEach(b=>b.onclick=()=>{state.orderTab=b.dataset.orderTab;renderOrderTabs();renderOrders(state.orders,el.ordersDialog.dataset.adminMode==="1")});
async function refreshOrdersBadge(notify=true){if(!(isAdmin()||isProcurement())||!internalMode()){el.ordersBadge.classList.add("hidden");return}const r=await supabase.from("orders").select("id,status,order_number,seller_name");if(r.error)return;const paid=(r.data||[]).filter(o=>o.status==="paid");el.ordersBadge.textContent=paid.length;el.ordersBadge.classList.toggle("hidden",paid.length===0);const seen=new Set(JSON.parse(localStorage.getItem("quatt-paid-seen")||"[]"));const fresh=paid.filter(o=>!seen.has(o.id));if(state.paidSeenReady&&notify)fresh.slice(0,3).forEach(o=>toast(`Оплачен заказ №${o.order_number}${o.seller_name?" · "+o.seller_name:""}`));paid.forEach(o=>seen.add(o.id));localStorage.setItem("quatt-paid-seen",JSON.stringify([...seen].slice(-300)));state.paidSeenReady=true}

let searchTimer;function maybeLogSearch(){
  clearTimeout(searchTimer);
  // Поиск администратора и снабженца — рабочий, в клиентскую статистику его не записываем.
  if(isAdmin()||isProcurement()) return;
  searchTimer=setTimeout(()=>{
    const term=state.q.trim();
    if(term.length>=2)supabase.rpc("log_catalog_search",{p_term:term.slice(0,120)}).then(()=>{});
  },900);
}
function renderSearchSuggestions(){const q=norm(state.q);if(q.length<1){el.searchSuggestions.classList.add("hidden");return}const rows=state.products.filter(p=>(canViewInternal()||p.active!==false)&&norm(`${p.name} ${p.brand||""}`).includes(q)).slice(0,7);el.searchSuggestions.classList.toggle("hidden",!rows.length);el.searchSuggestions.innerHTML=rows.map(p=>`<button data-suggest-product="${p.id}"><b>${esc(p.name)}</b>${p.brand?`<span>${esc(p.brand)}</span>`:""}</button>`).join("");el.searchSuggestions.querySelectorAll("[data-suggest-product]").forEach(b=>b.onclick=()=>{el.searchSuggestions.classList.add("hidden");openDetail(b.dataset.suggestProduct)})}

async function clearDashboardAnalytics(kind){
  if(!isAdmin())return;
  const isViews=kind==="views";
  const label=isViews?"всю статистику просмотров товаров":"всю статистику поисковых запросов";
  if(!confirm(`Очистить ${label}? Это действие нельзя отменить.`))return;
  try{
    const fn=isViews?"clear_product_view_events":"clear_catalog_search_events";
    const {error}=await supabase.rpc(fn);
    if(error)throw error;
    if(isViews)state.viewCounts={};
    toast(isViews?"Просмотры очищены":"Поиски очищены");
    await openDashboard(true);
    if(isViews)renderProducts();
  }catch(e){toast(e.message||String(e),true)}
}
async function deleteDashboardSearch(term){
  if(!isAdmin())return;
  if(!confirm(`Удалить из статистики запрос «${term}»?`))return;
  try{
    const {error}=await supabase.rpc("delete_catalog_search_term",{p_term:term});
    if(error)throw error;
    toast("Поисковый запрос удалён");
    await openDashboard(true);
  }catch(e){toast(e.message||String(e),true)}
}
async function blockDashboardSearch(term){
  if(!isAdmin())return;
  if(!confirm(`Скрыть запрос «${term}» и больше не учитывать его в дашборде?`))return;
  try{
    const {error}=await supabase.rpc("block_catalog_search_term",{p_term:term});
    if(error)throw error;
    toast("Запрос скрыт и больше не будет учитываться");
    await openDashboard(true);
  }catch(e){toast(e.message||String(e),true)}
}
async function unblockDashboardSearch(term){
  if(!isAdmin())return;
  try{
    const {error}=await supabase.rpc("unblock_catalog_search_term",{p_term:term});
    if(error)throw error;
    toast("Запрос снова разрешён");
    await openDashboard(true);
  }catch(e){toast(e.message||String(e),true)}
}
async function openDashboard(refreshOnly=false){
  if(!isAdmin())return;
  if(!refreshOnly)el.dashboardDialog.showModal();
  el.dashboardContent.innerHTML="Загрузка…";
  try{
    const since=new Date(Date.now()-30*864e5).toISOString();
    const [views,searches,orders,blocked]=await Promise.all([
      supabase.from("product_view_events").select("product_id,viewed_at").gte("viewed_at",since),
      supabase.from("catalog_search_events").select("term,searched_at").gte("searched_at",since),
      supabase.from("orders").select("id,status,total_amount,created_at").gte("created_at",since),
      supabase.rpc("get_catalog_search_blocklist")
    ]);
    if(views.error)throw views.error;
    if(searches.error)throw searches.error;
    if(orders.error)throw orders.error;
    if(blocked.error)throw blocked.error;
    const vc={};
    (views.data||[]).forEach(v=>vc[v.product_id]=(vc[v.product_id]||0)+1);
    state.viewCounts=vc;
    const topViews=Object.entries(vc).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const sc={},searchLabels={};
    (searches.data||[]).forEach(s=>{const k=norm(s.term);if(k){sc[k]=(sc[k]||0)+1;if(!searchLabels[k])searchLabels[k]=String(s.term||k)}});
    const topSearch=Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,20);
    const blockedTerms=(blocked.data||[]).map(x=>typeof x==="string"?x:(x.term_display||x.term_norm||"")).filter(Boolean);
    const os=orders.data||[];
    el.dashboardContent.innerHTML=`
      <div class="dash-stats">
        <div><span>Товаров</span><strong>${state.products.length}</strong></div>
        <div><span>Активных</span><strong>${state.products.filter(p=>p.active!==false).length}</strong></div>
        <div><span>Заказов 30 дней</span><strong>${os.length}</strong></div>
        <div><span>Оплачено</span><strong>${os.filter(o=>o.status==="paid").length}</strong></div>
        <div><span>Завершено</span><strong>${os.filter(o=>o.status==="issued").length}</strong></div>
        <div><span>Отменено</span><strong>${os.filter(o=>o.status==="cancelled").length}</strong></div>
      </div>
      <div class="dash-cols">
        <section>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">
            <h3 style="margin:0">Топ товаров по просмотрам</h3>
            <button class="small-btn danger-lite" id="clearViewsAnalyticsBtn" type="button">Очистить просмотры</button>
          </div>
          ${topViews.length?topViews.map(([id,n],i)=>`<div class="rank"><span>${i+1}. ${esc(state.products.find(p=>p.id===id)?.name||"Удалённый товар")}</span><b>${n}</b></div>`).join(""):'<p class="fine">Пока мало данных.</p>'}
        </section>
        <section>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">
            <h3 style="margin:0">Что ищут клиенты</h3>
            <button class="small-btn danger-lite" id="clearSearchAnalyticsBtn" type="button">Очистить поиски</button>
          </div>
          ${topSearch.length?topSearch.map(([q,n],i)=>{const label=searchLabels[q]||q;return `<div class="rank dashboard-search-row"><span>${i+1}. ${esc(label)}</span><b>${n}</b><span class="dash-row-actions"><button class="small-btn" type="button" data-delete-search="${esc(label)}">Удалить</button><button class="small-btn danger-lite" type="button" data-block-search="${esc(label)}">Не показывать</button></span></div>`}).join(""):'<p class="fine">Пока мало данных.</p>'}
          ${blockedTerms.length?`<div class="blocked-searches"><h4>Скрытые запросы</h4>${blockedTerms.map(term=>`<div class="rank"><span>${esc(term)}</span><button class="small-btn" type="button" data-unblock-search="${esc(term)}">Вернуть</button></div>`).join("")}</div>`:""}
        </section>
      </div>`;
    document.getElementById("clearViewsAnalyticsBtn")?.addEventListener("click",()=>clearDashboardAnalytics("views"));
    document.getElementById("clearSearchAnalyticsBtn")?.addEventListener("click",()=>clearDashboardAnalytics("searches"));
    el.dashboardContent.querySelectorAll("[data-delete-search]").forEach(b=>b.onclick=()=>deleteDashboardSearch(b.dataset.deleteSearch));
    el.dashboardContent.querySelectorAll("[data-block-search]").forEach(b=>b.onclick=()=>blockDashboardSearch(b.dataset.blockSearch));
    el.dashboardContent.querySelectorAll("[data-unblock-search]").forEach(b=>b.onclick=()=>unblockDashboardSearch(b.dataset.unblockSearch));
    renderProducts();
  }catch(e){el.dashboardContent.innerHTML=`<p class="error-text">${esc(e.message||e)}</p>`}
}
function openBulk(){if(!priv())return;el.bulkProducts.innerHTML=state.products.map(p=>`<label class="bulk-row"><input type="checkbox" value="${p.id}"><span>${esc(p.name)}</span><small>${esc(catName(p.category_id))}</small><b>${money(p.price)}</b></label>`).join("");el.bulkDialog.showModal()}
el.bulkSelectAll.onclick=()=>{const boxes=[...el.bulkProducts.querySelectorAll('input[type="checkbox"]')];const all=boxes.every(x=>x.checked);boxes.forEach(x=>x.checked=!all)};
el.applyBulkBtn.onclick=async()=>{const ids=[...el.bulkProducts.querySelectorAll('input:checked')].map(x=>x.value);if(!ids.length)return toast("Выберите товары",true);if(!confirm(`Изменить ${ids.length} товар(ов)?`))return;try{for(const id of ids){const p=state.products.find(x=>x.id===id),patch={};if(el.bulkCategory.value)patch.category_id=el.bulkCategory.value;if(el.bulkVisibility.value)patch.active=el.bulkVisibility.value==="true";if(el.bulkMarkup.value!==""){const n=Number(el.bulkMarkup.value);patch.markup=n;patch.price=roundRetail(Number(p.cost||0)*(1+n/100))}if(!Object.keys(patch).length)continue;const r=await supabase.from("products").update(patch).eq("id",id);if(r.error)throw r.error}toast("Массовое изменение готово");el.bulkDialog.close();await loadData()}catch(e){toast(e.message||String(e),true)}};

function excelRows(){return state.products.map(p=>({Название:p.name,Категория:catName(p.category_id),Бренд:p.brand||"",Цена:Number(p.price||0),Закуп:Number(p.cost||0),Наценка:Number(p.markup||0),Наличие:availabilityLabel(p.availability||"order"),Характеристики:p.specs||"",Поставщик:p.supplier||"",Адрес_поставщика:p.supplier_address||"",Контакт_поставщика:p.supplier_contact||"",Дата_проверки:p.checked_date||"",Фото:imgsFor(p.id).map(i=>publicUrl(i.image_path)).join("; ")}))}
function downloadWorkbook(rows,name,sheet="Товары"){if(!window.XLSX)return toast("Модуль Excel ещё загружается. Повтори через секунду.",true);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),sheet);XLSX.writeFile(wb,name)}
el.exportExcelBtn.onclick=()=>downloadWorkbook(excelRows(),`QUATT_catalog_${new Date().toISOString().slice(0,10)}.xlsx`);
el.exportSatuBtn.onclick=()=>{const rows=state.products.filter(p=>p.active!==false).map(p=>({Название_позиции:p.name,Название_группы:catName(p.category_id),Бренд:p.brand||"",Цена:Number(p.price||0),Валюта:"KZT",Единица_измерения:"шт.",Наличие:p.availability==="in_stock"?"+":p.availability==="out_of_stock"?"-":"под заказ",Описание:p.specs||"",Ссылка_изображения:imgsFor(p.id).map(i=>publicUrl(i.image_path)).join(", ")}));downloadWorkbook(rows,`QUATT_SATU_PREP_${new Date().toISOString().slice(0,10)}.xlsx`,"Satu")};
function rowVal(row,names){for(const [k,v] of Object.entries(row)){if(names.some(n=>norm(k)===norm(n)))return v}return ""}
el.excelImport.onchange=async()=>{const file=el.excelImport.files?.[0];el.excelImport.value="";if(!file)return;if(!window.XLSX)return toast("Модуль Excel ещё загружается",true);if(!confirm("Импортировать товары из файла?"))return;try{const data=await file.arrayBuffer();const wb=XLSX.read(data);const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});let added=0,skipped=0;for(const row of rows){const name=String(rowVal(row,["Название","Наименование","Название товара","name"])).trim();if(!name){skipped++;continue}const brand=String(rowVal(row,["Бренд","brand"])).trim();if(findDuplicate(name,brand,"")){skipped++;continue}const catText=String(rowVal(row,["Категория","Группа","category"])).trim();let cat=state.categories.find(c=>norm(c.name)===norm(catText));if(catText&&!cat)cat=await addCategory(catText);const price=Number(rowVal(row,["Цена","Розничная цена","price"]))||0,cost=Number(rowVal(row,["Закуп","Закупочная цена","cost"]))||0,specs=String(rowVal(row,["Характеристики","Описание","specs"])).trim();const payload={name,brand:brand||null,category_id:cat?.id||null,price,cost,markup:cost?((price/cost)-1)*100:0,specs:specs||null,delivery:"1 день",active:true,availability:"order",price_mode:"show",keywords:uniq([name,brand,catText,...Object.values(parseSpecs(specs))].join(" ").split(/\s+/)).join(", "),supplier:String(rowVal(row,["Поставщик","supplier"])).trim()||null};const r=await supabase.from("products").insert(payload);if(r.error)throw r.error;added++}toast(`Импорт: добавлено ${added}, пропущено ${skipped}`);await loadData()}catch(e){toast(e.message||String(e),true)}};

el.searchInput.oninput=()=>{state.q=el.searchInput.value;el.clearSearchBtn.classList.toggle("hidden",!state.q);renderSearchSuggestions();renderProducts();maybeLogSearch()};el.clearSearchBtn.onclick=()=>{el.searchInput.value="";state.q="";el.clearSearchBtn.classList.add("hidden");el.searchSuggestions.classList.add("hidden");renderProducts()};el.brandFilter.onchange=()=>{state.brand=el.brandFilter.value;renderProducts()};el.availabilityFilter.onchange=()=>{state.availability=el.availabilityFilter.value;renderProducts()};el.maxPrice.oninput=()=>{state.max=el.maxPrice.value;renderProducts()};el.sortFilter.onchange=()=>{state.sort=el.sortFilter.value;renderProducts()};el.mobileCategory.onchange=()=>setCat(el.mobileCategory.value);
el.loginBtn.onclick=()=>el.loginDialog.showModal();el.loginForm.onsubmit=async e=>{e.preventDefault();el.loginError.textContent="";const {data,error}=await supabase.auth.signInWithPassword({email:el.loginEmail.value.trim(),password:el.loginPassword.value});if(error){el.loginError.textContent=error.message;return}state.session=data.session;state.roleMode="native";el.loginDialog.close();await loadRole();await loadData();refreshOrdersBadge(false)};el.logoutBtn.onclick=async()=>{await supabase.auth.signOut();state.session=null;state.role="guest";state.roleMode="native";state.customerMode=false;state.selectedSellerId=null;state.cart=[];await loadData()};
el.roleModeBtn.onclick=()=>{if(!isAdmin())return;state.customerMode=false;state.roleMode=state.roleMode==="seller"?"native":"seller";syncSelectedSeller();render()};el.customerModeBtn.onclick=()=>{if(!isAdmin())return;state.customerMode=!state.customerMode;if(state.customerMode)state.roleMode="native";syncSelectedSeller();render()};el.addProductBtn.onclick=()=>openProduct();el.mobileAddProductBtn.onclick=()=>openProduct();el.manageBtn.onclick=openManage;el.manageBtnDesktop.onclick=openManage;el.sellerPicker.onchange=()=>{state.selectedSellerId=el.sellerPicker.value||null;if(state.selectedSellerId)localStorage.setItem(sellerSelectionKey(),state.selectedSellerId);loadCart();renderAuth()};el.cartBtn.onclick=()=>{if(!requireSeller())return;renderCart();el.cartDialog.showModal()};el.checkoutBtn.onclick=()=>{if(!state.cart.length||!requireSeller())return;resetCheckoutForm();el.cartDialog.close();el.checkoutDialog.showModal()};el.checkoutForm.onsubmit=async e=>{e.preventDefault();try{const o=await createOrder();if(o){el.checkoutDialog.close();toast(`Заказ №${o.order_number} создан`);resetCheckoutForm()}}catch(e){toast(e.message||String(e),true)}};el.ordersBtn.onclick=()=>{state.orderTab="active";if(canManageOrders())openOrders(true)};el.myOrdersBtn.onclick=()=>{state.orderTab="active";openOrders(false)};
el.favoritesBtn.onclick=()=>{renderFavorites();el.favoritesDialog.showModal()};el.customerCartBtn.onclick=()=>{renderCustomerCart();el.customerCartDialog.showModal()};el.sendCustomerCartBtn.onclick=sendCustomerCart;el.contactsBtn.onclick=()=>el.contactsDialog.showModal();el.contactWhatsappBtn.onclick=()=>openWhatsapp();el.footerWhatsappBtn.onclick=()=>openWhatsapp();el.helpWhatsappBtn.onclick=()=>openWhatsapp("Здравствуйте! Пришёл с сайта QUATT QURYLYS. Не нашёл нужный товар. Помогите подобрать / заказать.");el.notFoundBtn.onclick=()=>el.helpWhatsappBtn.click();el.recentBtn.onclick=()=>{el.recentSection.classList.remove("hidden");el.recentSection.scrollIntoView({behavior:"smooth"})};el.clearRecentBtn.onclick=()=>{state.recent=[];saveLocal();renderRecent()};el.dashboardBtn.onclick=()=>openDashboard(false);el.bulkBtn.onclick=openBulk;



// ===== V2.5.8: Price-tag studio / PDF / multi-print =====
const PRICE_TAG_PRESETS={
  "58x40":{label:"58 × 40 мм",w:58,h:40},
  "70x50":{label:"70 × 50 мм",w:70,h:50},
  "90x60":{label:"90 × 60 мм",w:90,h:60},
  "100x70":{label:"100 × 70 мм",w:100,h:70},
  "a6":{label:"A6 — 105 × 148 мм",w:105,h:148},
  "custom":{label:"Свой размер",w:90,h:60}
};
let priceTagSelection=new Set();

function loadScriptOnce(src,test){return new Promise((resolve,reject)=>{if(test())return resolve();const old=[...document.scripts].find(x=>x.src===src);if(old){old.addEventListener("load",resolve,{once:true});old.addEventListener("error",reject,{once:true});return}const sc=document.createElement("script");sc.src=src;sc.async=true;sc.onload=resolve;sc.onerror=()=>reject(new Error("Не удалось загрузить модуль"));document.head.appendChild(sc)})}
async function ensurePriceTagLibs(){await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",()=>!!window.QRCode);await loadScriptOnce("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",()=>!!window.jspdf?.jsPDF)}
async function qrDataUrl(text,size=360){await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",()=>!!window.QRCode);const box=document.createElement("div");box.style.cssText="position:fixed;left:-99999px;top:-99999px";document.body.appendChild(box);new QRCode(box,{text,width:size,height:size,correctLevel:window.QRCode.CorrectLevel.M});await new Promise(r=>setTimeout(r,30));const canvas=box.querySelector("canvas"),img=box.querySelector("img");const out=canvas?.toDataURL("image/png")||img?.src||"";box.remove();return out}
function priceTagConfig(){const dlg=$("priceTagDialog"),preset=dlg.querySelector("#ptPreset").value;let w=PRICE_TAG_PRESETS[preset]?.w||90,h=PRICE_TAG_PRESETS[preset]?.h||60;if(preset==="custom"){w=Math.max(35,Math.min(190,Number(dlg.querySelector("#ptWidth").value)||90));h=Math.max(25,Math.min(277,Number(dlg.querySelector("#ptHeight").value)||60))}if(dlg.querySelector("#ptOrientation").value==="portrait"&&w>h)[w,h]=[h,w];if(dlg.querySelector("#ptOrientation").value==="landscape"&&h>w)[w,h]=[h,w];return {w,h,bw:dlg.querySelector("#ptBw").checked,qr:dlg.querySelector("#ptQr").checked,copies:Math.max(1,Math.min(50,Number(dlg.querySelector("#ptCopies").value)||1)),gap:2,margin:5}}
function priceTagLayout(cfg){const usableW=210-cfg.margin*2,usableH=297-cfg.margin*2;const cols=Math.max(1,Math.floor((usableW+cfg.gap)/(cfg.w+cfg.gap))),rows=Math.max(1,Math.floor((usableH+cfg.gap)/(cfg.h+cfg.gap)));return {cols,rows,perPage:cols*rows}}
function wrapCanvasText(ctx,text,maxWidth,maxLines){const words=String(text||"").split(/\s+/),lines=[];let cur="";for(const word of words){const t=cur?cur+" "+word:word;if(ctx.measureText(t).width<=maxWidth)cur=t;else{if(cur)lines.push(cur);cur=word;if(lines.length>=maxLines-1)break}}if(cur&&lines.length<maxLines)lines.push(cur);if(lines.length===maxLines&&words.length){let last=lines[maxLines-1];while(last.length>2&&ctx.measureText(last+"…").width>maxWidth)last=last.slice(0,-1);lines[maxLines-1]=last+"…"}return lines}
function fitFont(ctx,text,maxWidth,start,min=10){let size=start;while(size>min){ctx.font=`900 ${size}px Arial, sans-serif`;if(ctx.measureText(String(text)).width<=maxWidth)break;size-=1}return size}
async function renderPriceTagCanvas(p,cfg){const ppm=8,W=Math.max(280,Math.round(cfg.w*ppm)),H=Math.max(200,Math.round(cfg.h*ppm)),c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d"),pad=Math.max(14,Math.round(W*.035));x.fillStyle="#fff";x.fillRect(0,0,W,H);x.strokeStyle="#000";x.lineWidth=Math.max(3,Math.round(W*.004));x.strokeRect(x.lineWidth/2,x.lineWidth/2,W-x.lineWidth,H-x.lineWidth);const yellow="#f2e500",black="#111";x.textBaseline="top";x.font=`900 ${Math.max(18,Math.round(H*.095))}px Arial, sans-serif`;x.fillStyle=cfg.bw?black:yellow;x.fillText("QUATT",pad,pad);const qw=x.measureText("QUATT").width;x.fillStyle=black;x.font=`800 ${Math.max(14,Math.round(H*.072))}px Arial, sans-serif`;x.fillText("QURYLYS",pad+qw+Math.round(W*.025),pad+Math.round(H*.014));const qrSize=cfg.qr?Math.min(Math.round(W*.28),Math.round(H*.48)):0;const qrX=W-pad-qrSize,qrY=Math.round(H*.30);const textW=cfg.qr?qrX-pad*2:W-pad*2;const nameY=Math.round(H*.24);x.fillStyle=black;x.font=`700 ${Math.max(16,Math.round(H*.07))}px Arial, sans-serif`;const lines=wrapCanvasText(x,p.name,textW,2);lines.forEach((line,i)=>x.fillText(line,pad,nameY+i*Math.round(H*.078)));const price=priceText(p),priceY=Math.round(H*.55);const priceSize=fitFont(x,price,textW,Math.max(28,Math.round(H*.18)),18);x.fillStyle=black;x.font=`900 ${priceSize}px Arial, sans-serif`;x.fillText(price,pad,priceY);x.font=`500 ${Math.max(12,Math.round(H*.045))}px Arial, sans-serif`;x.fillStyle="#333";x.fillText("Нұрсая 17 · 09:00–21:00",pad,H-pad-Math.max(14,Math.round(H*.05)));if(cfg.qr){const data=await qrDataUrl(productLink(p.id),320);if(data){const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=data});x.drawImage(img,qrX,qrY,qrSize,qrSize)}}return c}
function expandedPriceTagProducts(cfg){const base=state.products.filter(p=>priceTagSelection.has(p.id));const out=[];for(const p of base)for(let i=0;i<cfg.copies;i++)out.push(p);return out}
async function buildPriceTagAssets(cfg){const products=expandedPriceTagProducts(cfg);if(!products.length)throw new Error("Выберите хотя бы один товар");const cache=new Map(),items=[];for(const p of products){let data=cache.get(p.id);if(!data){const canvas=await renderPriceTagCanvas(p,cfg);data=canvas.toDataURL("image/png",1);cache.set(p.id,data)}items.push({p,data})}return items}
function priceTagPositions(count,cfg){const lay=priceTagLayout(cfg),pos=[];for(let i=0;i<count;i++){const n=i%lay.perPage,page=Math.floor(i/lay.perPage),row=Math.floor(n/lay.cols),col=n%lay.cols;pos.push({page,x:cfg.margin+col*(cfg.w+cfg.gap),y:cfg.margin+row*(cfg.h+cfg.gap)})}return {positions:pos,...lay,pages:Math.ceil(count/lay.perPage)}}
async function downloadPriceTagPdf(){try{const dlg=$("priceTagDialog"),cfg=priceTagConfig();dlg.querySelector("#ptBusy").textContent="Готовим PDF…";await ensurePriceTagLibs();const items=await buildPriceTagAssets(cfg),layout=priceTagPositions(items.length,cfg),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});items.forEach((it,i)=>{const p=layout.positions[i];if(p.page>0&&p.page!==layout.positions[i-1]?.page)pdf.addPage("a4","portrait");pdf.addImage(it.data,"PNG",p.x,p.y,cfg.w,cfg.h,undefined,"FAST")});pdf.save(`QUATT_price_tags_${new Date().toISOString().slice(0,10)}.pdf`);dlg.querySelector("#ptBusy").textContent="PDF скачан";setTimeout(()=>dlg.querySelector("#ptBusy").textContent="",1800)}catch(e){console.error(e);toast(e.message||String(e),true);const b=$("priceTagDialog")?.querySelector("#ptBusy");if(b)b.textContent=""}}
async function printPriceTags(){try{const dlg=$("priceTagDialog"),cfg=priceTagConfig();dlg.querySelector("#ptBusy").textContent="Готовим печать…";const items=await buildPriceTagAssets(cfg),layout=priceTagPositions(items.length,cfg),pages=Array.from({length:layout.pages},()=>[]);items.forEach((it,i)=>pages[layout.positions[i].page].push({it,pos:layout.positions[i]}));const w=window.open("","_blank");if(!w)throw new Error("Браузер заблокировал окно печати");const html=pages.map((pg,pi)=>`<section class="sheet">${pg.map(({it,pos})=>`<img src="${it.data}" style="left:${pos.x}mm;top:${pos.y}mm;width:${cfg.w}mm;height:${cfg.h}mm">`).join("")}</section>`).join("");w.document.write(`<html><head><title>Ценники QUATT</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff}.sheet{position:relative;width:210mm;height:297mm;page-break-after:always;overflow:hidden}.sheet:last-child{page-break-after:auto}.sheet img{position:absolute;object-fit:fill}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();dlg.querySelector("#ptBusy").textContent=""}catch(e){console.error(e);toast(e.message||String(e),true);const b=$("priceTagDialog")?.querySelector("#ptBusy");if(b)b.textContent=""}}
function priceTagPreview(){const dlg=$("priceTagDialog");if(!dlg)return;const cfg=priceTagConfig(),lay=priceTagLayout(cfg),count=expandedPriceTagProducts(cfg).length;dlg.querySelector("#ptSheetInfo").textContent=`Размер ${Math.round(cfg.w)}×${Math.round(cfg.h)} мм · ${lay.perPage} шт. на A4 · страниц: ${Math.max(1,Math.ceil(count/lay.perPage))}`;const custom=dlg.querySelector("#ptCustomSize");custom.classList.toggle("hidden",dlg.querySelector("#ptPreset").value!=="custom");const first=state.products.find(p=>priceTagSelection.has(p.id));const box=dlg.querySelector("#ptPreview");if(!first){box.innerHTML="<span>Выберите товар</span>";return}box.innerHTML=`<div class="pt-mini-tag ${cfg.bw?"bw":""}"><div class="pt-mini-logo"><b>QUATT</b> QURYLYS</div><div class="pt-mini-name">${esc(first.name)}</div><div class="pt-mini-price">${esc(priceText(first))}</div>${cfg.qr?'<div class="pt-mini-qr">QR</div>':''}<small>Нұрсая 17 · 09:00–21:00</small></div>`}
function renderPriceTagProducts(){const dlg=$("priceTagDialog"),q=norm(dlg.querySelector("#ptSearch").value),list=dlg.querySelector("#ptProducts");const rows=state.products.filter(p=>!q||norm([p.name,p.brand,catName(p.category_id)].join(" ")).includes(q)).slice(0,250);list.innerHTML=rows.map(p=>`<label class="pt-product-row"><input type="checkbox" value="${p.id}" ${priceTagSelection.has(p.id)?"checked":""}><span><b>${esc(p.name)}</b><small>${esc(catName(p.category_id))}${p.brand?" · "+esc(p.brand):""}</small></span><strong>${esc(priceText(p))}</strong></label>`).join("")||'<p class="fine">Ничего не найдено</p>';list.querySelectorAll("input[type=checkbox]").forEach(ch=>ch.onchange=()=>{if(ch.checked)priceTagSelection.add(ch.value);else priceTagSelection.delete(ch.value);dlg.querySelector("#ptSelectedCount").textContent=priceTagSelection.size;priceTagPreview()})}
function ensurePriceTagStudio(){if($("priceTagDialog"))return;const d=document.createElement("dialog");d.id="priceTagDialog";d.className="price-tag-dialog";d.innerHTML=`<div class="pt-shell"><div class="pt-head"><div><h2>Ценники</h2><p>Печать и PDF для другого компьютера</p></div><button type="button" class="pt-close">×</button></div><div class="pt-grid"><section class="pt-left"><div class="pt-toolbar"><input id="ptSearch" type="search" placeholder="Найти товар…"><button id="ptSelectVisible" type="button">Выбрать найденные</button><button id="ptClearSelection" type="button">Снять выбор</button></div><div class="pt-selected">Выбрано: <b id="ptSelectedCount">0</b></div><div id="ptProducts" class="pt-products"></div></section><section class="pt-right"><label>Шаблон<select id="ptPreset">${Object.entries(PRICE_TAG_PRESETS).map(([k,v])=>`<option value="${k}" ${k==="90x60"?"selected":""}>${v.label}</option>`).join("")}</select></label><div id="ptCustomSize" class="pt-size-row hidden"><label>Ширина, мм<input id="ptWidth" type="number" min="35" max="190" step="1" value="90"></label><label>Высота, мм<input id="ptHeight" type="number" min="25" max="277" step="1" value="60"></label></div><label>Ориентация<select id="ptOrientation"><option value="landscape">Горизонтальная</option><option value="portrait">Вертикальная</option></select></label><label>Копий каждого товара<input id="ptCopies" type="number" min="1" max="50" step="1" value="1"></label><label class="pt-check"><input id="ptQr" type="checkbox" checked> Показывать QR-код</label><label class="pt-check"><input id="ptBw" type="checkbox"> Чёрно-белая печать</label><div id="ptSheetInfo" class="pt-sheet-info"></div><div id="ptPreview" class="pt-preview"></div><div id="ptBusy" class="pt-busy"></div><div class="pt-actions"><button id="ptDownloadPdf" type="button" class="primary">Скачать PDF</button><button id="ptPrint" type="button">Печатать</button></div></section></div></div>`;document.body.appendChild(d);d.querySelector(".pt-close").onclick=()=>d.close();d.addEventListener("click",e=>{if(e.target===d)d.close()});d.querySelector("#ptSearch").oninput=renderPriceTagProducts;d.querySelector("#ptSelectVisible").onclick=()=>{d.querySelectorAll("#ptProducts input[type=checkbox]").forEach(ch=>{ch.checked=true;priceTagSelection.add(ch.value)});d.querySelector("#ptSelectedCount").textContent=priceTagSelection.size;priceTagPreview()};d.querySelector("#ptClearSelection").onclick=()=>{priceTagSelection.clear();renderPriceTagProducts();d.querySelector("#ptSelectedCount").textContent=0;priceTagPreview()};["ptPreset","ptOrientation","ptCopies","ptQr","ptBw","ptWidth","ptHeight"].forEach(id=>d.querySelector("#"+id).addEventListener("input",priceTagPreview));d.querySelector("#ptDownloadPdf").onclick=downloadPriceTagPdf;d.querySelector("#ptPrint").onclick=printPriceTags}
function openPriceTagStudio(ids=[]){if(!canEditProducts())return;ensurePriceTagStudio();priceTagSelection=new Set((ids||[]).filter(Boolean));const d=$("priceTagDialog");d.querySelector("#ptSearch").value="";d.querySelector("#ptSelectedCount").textContent=priceTagSelection.size;renderPriceTagProducts();priceTagPreview();d.showModal()}
function setupPriceTagToolbar(){if(document.getElementById("priceTagsBtn")||!el.bulkBtn)return;const b=document.createElement("button");b.id="priceTagsBtn";b.type="button";b.textContent="Ценники";b.className="hidden";el.bulkBtn.insertAdjacentElement("afterend",b);b.onclick=()=>openPriceTagStudio([]);const sync=()=>b.classList.toggle("hidden",el.bulkBtn.classList.contains("hidden")||!canEditProducts());new MutationObserver(sync).observe(el.bulkBtn,{attributes:true,attributeFilter:["class"]});sync()}

function setupMobileHeaderUI(){
  const header=document.querySelector("header");
  if(!header||document.getElementById("mobileMenuBtn"))return;
  const btn=document.createElement("button");
  btn.id="mobileMenuBtn";
  btn.type="button";
  btn.className="mobile-menu-btn hidden";
  btn.setAttribute("aria-label","Открыть меню");
  btn.setAttribute("aria-expanded","false");
  btn.innerHTML='<span aria-hidden="true">☰</span>';
  header.appendChild(btn);
  btn.addEventListener("click",()=>{
    const open=!document.body.classList.contains("mobile-nav-open");
    document.body.classList.toggle("mobile-nav-open",open);
    btn.setAttribute("aria-expanded",open?"true":"false");
    btn.innerHTML=open?'<span aria-hidden="true">×</span>':'<span aria-hidden="true">☰</span>';
  });
  document.querySelector(".header-right")?.addEventListener("click",e=>{
    if(window.innerWidth>760)return;
    if(e.target.closest("button")){
      document.body.classList.remove("mobile-nav-open");
      btn.setAttribute("aria-expanded","false");
      btn.innerHTML='<span aria-hidden="true">☰</span>';
    }
  });
  window.addEventListener("resize",()=>{if(window.innerWidth>760)document.body.classList.remove("mobile-nav-open")});
}
function syncMobileHeaderUI(){
  const btn=document.getElementById("mobileMenuBtn");
  if(!btn)return;
  const logged=!!state.session;
  btn.classList.toggle("hidden",!logged);
  if(!logged){
    document.body.classList.remove("mobile-nav-open");
    btn.setAttribute("aria-expanded","false");
    btn.innerHTML='<span aria-hidden="true">☰</span>';
  }
}

function setupMobileCatalogUI(){
  const filters=document.querySelector(".filters");
  const searchWrap=document.querySelector(".search-wrap");
  if(!filters||!searchWrap||document.getElementById("mobileFilterToggle"))return;
  const btn=document.createElement("button");
  btn.id="mobileFilterToggle";
  btn.type="button";
  btn.className="mobile-filter-toggle";
  btn.innerHTML='<span>Фильтры</span><span class="mobile-filter-chevron">⌄</span>';
  searchWrap.insertAdjacentElement("afterend",btn);
  const sync=()=>{
    const open=document.body.classList.contains("mobile-filters-open");
    btn.classList.toggle("active",open);
    btn.querySelector("span").textContent=open?"Скрыть фильтры":"Фильтры";
    btn.querySelector(".mobile-filter-chevron").textContent=open?"⌃":"⌄";
  };
  btn.addEventListener("click",()=>{document.body.classList.toggle("mobile-filters-open");sync()});
  sync();
}


function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function createLaunchSplash(){
  if(document.getElementById('launchSplash')) return;
  const wrap=document.createElement('div');
  wrap.id='launchSplash';
  wrap.className='launch-splash';
  wrap.innerHTML=`
    <div class="launch-splash__inner">
      <div class="launch-splash__badge">Q</div>
      <div class="launch-splash__brand">QUATT QURYLYS</div>
      <div class="launch-splash__sub">Каталог товаров</div>
      <div class="launch-splash__dots" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>`;
  document.body.appendChild(wrap);
}
function hideLaunchSplash(){
  const wrap=document.getElementById('launchSplash');
  if(!wrap) return;
  wrap.classList.add('is-hiding');
  setTimeout(()=>wrap.remove(),420);
}
window.addEventListener('offline',()=>toast('Нет подключения к интернету',true));
window.addEventListener('online',()=>toast('Интернет снова подключен'));

async function init(){
  createLaunchSplash();
  setupMobileHeaderUI();
  setupMobileCatalogUI();
  setupPriceTagToolbar();
  loadLocal();
  const started=Date.now();
  const {data}=await supabase.auth.getSession();
  state.session=data.session;
  await loadRole();
  await loadData();
  renderLocalBadges();
  if(isAdmin()||isProcurement()){
    refreshOrdersBadge(false);
    setInterval(()=>refreshOrdersBadge(true),30000)
  }
  const waitMore=Math.max(0,800-(Date.now()-started));
  if(waitMore) await sleep(waitMore);
  hideLaunchSplash();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=2591").catch(()=>{})
}
init();
