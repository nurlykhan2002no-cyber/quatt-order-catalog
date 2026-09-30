import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const state = {
  session:null, role:"guest", email:"",
  customerMode:false, categories:[], products:[], images:[], staff:[],
  cat:"all", q:"", brand:"all", max:"", sort:"Сначала новые",
  editing:null, formImages:[], cart:[], orders:[], sellerNames:[], selectedSellerId:null, orderTab:"active", paidSeenReady:false
};

const el = {
  loginBtn:$("loginBtn"), logoutBtn:$("logoutBtn"), customerModeBtn:$("customerModeBtn"),
  manageBtn:$("manageBtn"), manageBtnDesktop:$("manageBtnDesktop"), sideBottom:$("sideBottom"),
  addProductBtn:$("addProductBtn"), mobileAddProductBtn:$("mobileAddProductBtn"),
  desktopCategories:$("desktopCategories"), mobileCategory:$("mobileCategory"), pageTitle:$("pageTitle"),
  searchInput:$("searchInput"), clearSearchBtn:$("clearSearchBtn"), brandFilter:$("brandFilter"),
  maxPrice:$("maxPrice"), sortFilter:$("sortFilter"), resultCount:$("resultCount"),
  stateBox:$("stateBox"), catalogGrid:$("catalogGrid"),
  loginDialog:$("loginDialog"), loginForm:$("loginForm"), loginEmail:$("loginEmail"),
  loginPassword:$("loginPassword"), loginError:$("loginError"),
  detailDialog:$("detailDialog"), detailTitle:$("detailTitle"), detailContent:$("detailContent"),
  productDialog:$("productDialog"), productForm:$("productForm"), productDialogTitle:$("productDialogTitle"),
  productId:$("productId"), photoInput:$("photoInput"), photoThumbs:$("photoThumbs"),
  fName:$("fName"), fCategory:$("fCategory"), fBrand:$("fBrand"), fArticle:$("fArticle"),
  fPrice:$("fPrice"), fDelivery:$("fDelivery"), fSpecs:$("fSpecs"), fKeywords:$("fKeywords"),
  fCost:$("fCost"), fSupplier:$("fSupplier"), fSupplierAddress:$("fSupplierAddress"),
  fSupplierContact:$("fSupplierContact"), fCheckedDate:$("fCheckedDate"), fNotes:$("fNotes"),
  fActive:$("fActive"), manualMarkup:$("manualMarkup"), applyManualMarkup:$("applyManualMarkup"),
  marginInfo:$("marginInfo"), deleteProductBtn:$("deleteProductBtn"),
  ownerCategoryAdd:$("ownerCategoryAdd"), newCategoryInForm:$("newCategoryInForm"),
  addCategoryInFormBtn:$("addCategoryInFormBtn"),
  manageDialog:$("manageDialog"), staffSection:$("staffSection"), staffForm:$("staffForm"),
  staffEmail:$("staffEmail"), staffRole:$("staffRole"), staffList:$("staffList"),
  categoryForm:$("categoryForm"), newCategoryName:$("newCategoryName"), categoryManager:$("categoryManager"),
  sellerNameForm:$("sellerNameForm"), newSellerName:$("newSellerName"), sellerNamesList:$("sellerNamesList"),
  toastHost:$("toastHost"),
  ordersBtn:$("ordersBtn"), ordersBadge:$("ordersBadge"), myOrdersBtn:$("myOrdersBtn"),
  sellerPickerWrap:$("sellerPickerWrap"), sellerPicker:$("sellerPicker"),
  cartBtn:$("cartBtn"), cartBadge:$("cartBadge"), cartDialog:$("cartDialog"), cartItems:$("cartItems"),
  cartTotal:$("cartTotal"), checkoutBtn:$("checkoutBtn"), checkoutDialog:$("checkoutDialog"),
  checkoutForm:$("checkoutForm"), clientName:$("clientName"), clientPhone:$("clientPhone"),
  orderNote:$("orderNote"), initialStatus:$("initialStatus"),
  ordersDialog:$("ordersDialog"), ordersDialogTitle:$("ordersDialogTitle"),
  ordersDialogSub:$("ordersDialogSub"), ordersList:$("ordersList"), orderTabs:$("orderTabs")
};

const isAdmin = () => ["owner","admin"].includes(state.role);
const isOwner = () => state.role === "owner";
const isSeller = () => state.role === "seller";
const priv = () => isAdmin() && !state.customerMode;
const money = n => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Number(n||0))+" ₸";
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function toast(msg,error=false){
  const d=document.createElement("div"); d.className="toast"+(error?" error":""); d.textContent=msg;
  el.toastHost.appendChild(d); setTimeout(()=>d.remove(),3800);
}
function closeDialog(id){ const d=$(id); if(d?.open)d.close(); }
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));

function publicUrl(path){
  if(!path)return "";
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
function imgsFor(productId){return state.images.filter(i=>i.product_id===productId).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));}
function catName(id){return state.categories.find(c=>c.id===id)?.name||"Без категории";}

async function loadRole(){
  if(!state.session){state.role="guest";state.email="";return;}
  state.email=state.session.user.email||"";
  const {data,error}=await supabase.rpc("catalog_role");
  if(error){state.role="seller";console.warn(error);return;}
  state.role=data||"seller";
}

async function loadData(){
  try{
    const catQ=supabase.from("categories").select("*").order("sort_order").order("name");
    const imgQ=supabase.from("product_images").select("*").order("sort_order");
    let prodQ;
    if(isAdmin()) prodQ=supabase.from("products").select("*").order("created_at",{ascending:false});
    else prodQ=supabase.rpc("get_public_products");
    const sellersQ=state.session
      ? supabase.from("seller_names").select("*").order("sort_order").order("name")
      : Promise.resolve({data:[],error:null});
    const [cats,imgs,prods,sellers]=await Promise.all([catQ,imgQ,prodQ,sellersQ]);
    if(cats.error)throw cats.error;if(imgs.error)throw imgs.error;if(prods.error)throw prods.error;if(sellers.error)throw sellers.error;
    state.categories=cats.data||[];state.images=imgs.data||[];state.products=prods.data||[];state.sellerNames=sellers.data||[];
    syncSelectedSeller();
    render();
  }catch(e){
    console.error(e);
    el.catalogGrid.classList.add("hidden");
    el.stateBox.classList.remove("hidden");
    el.stateBox.innerHTML=`<h2>Не удалось открыть каталог</h2><p>${esc(e.message||e)}</p><p class="fine">Если вы только что обновили каталог, сначала выполните SUPABASE_UPDATE_V2_3.sql.</p>`;
  }
}

function sellerSelectionKey(){return `quatt-seller-name:${state.email||"shared"}`;}
function selectedSeller(){return state.sellerNames.find(x=>x.id===state.selectedSellerId)||null;}
function syncSelectedSeller(){
  if(!isSeller()){state.selectedSellerId=null;return;}
  const active=state.sellerNames.filter(x=>x.active!==false);
  const saved=localStorage.getItem(sellerSelectionKey());
  if(saved&&active.some(x=>x.id===saved))state.selectedSellerId=saved;
  else if(!active.some(x=>x.id===state.selectedSellerId))state.selectedSellerId=active[0]?.id||null;
  if(state.selectedSellerId)localStorage.setItem(sellerSelectionKey(),state.selectedSellerId);
  loadCart();
}

function renderAuth(){
  el.loginBtn.classList.toggle("hidden",!!state.session);
  el.logoutBtn.classList.toggle("hidden",!state.session);
  el.customerModeBtn.classList.toggle("hidden",!isAdmin());
  el.manageBtn.classList.toggle("hidden",!isOwner());
  el.sideBottom.classList.toggle("hidden",!isOwner());
  el.addProductBtn.classList.toggle("hidden",!priv());
  el.mobileAddProductBtn.classList.toggle("hidden",!priv());
  el.ownerCategoryAdd.classList.toggle("hidden",!isOwner());
  el.ordersBtn.classList.toggle("hidden",!isAdmin());
  el.myOrdersBtn.classList.toggle("hidden",!isSeller());
  el.cartBtn.classList.toggle("hidden",!isSeller());
  el.sellerPickerWrap.classList.toggle("hidden",!isSeller());
  if(isSeller()){
    const active=state.sellerNames.filter(x=>x.active!==false);
    el.sellerPicker.innerHTML=active.length
      ? active.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")
      : `<option value="">Нет имён продавцов</option>`;
    el.sellerPicker.value=state.selectedSellerId||"";
    el.sellerPicker.disabled=!active.length;
  }
  el.customerModeBtn.classList.toggle("active",state.customerMode);
  el.customerModeBtn.textContent=state.customerMode?"↩ Вернуться к работе":"◉ Режим клиента";
  renderCartBadge();
}

function renderCategories(){
  const visible=state.products.filter(p=>priv()||p.active!==false);
  const btn=(id,name,count)=>`<button class="nav ${state.cat===id?"selected":""}" data-cat="${id}"><span>${esc(name)}</span>${id==="all"?`<span class="count">${count}</span>`:`<span class="arrow">›</span>`}</button>`;
  el.desktopCategories.innerHTML=btn("all","Все товары",visible.length)+state.categories.filter(c=>c.active||isAdmin()).map(c=>btn(c.id,c.name,0)).join("");
  el.desktopCategories.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{state.cat=b.dataset.cat;render()});
  el.mobileCategory.innerHTML=`<option value="all">Все товары</option>`+state.categories.filter(c=>c.active||isAdmin()).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  el.mobileCategory.value=state.cat;
  el.pageTitle.textContent=state.cat==="all"?"Выберите то, что подходит":catName(state.cat);
  el.fCategory.innerHTML=state.categories.filter(c=>c.active||isAdmin()).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
}

function filteredProducts(){
  const q=state.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let rows=state.products.filter(p=>{
    if(!priv()&&p.active===false)return false;
    if(state.cat!=="all"&&p.category_id!==state.cat)return false;
    if(state.brand!=="all"&&(p.brand||"")!==state.brand)return false;
    if(state.max&&Number(p.price)>Number(state.max))return false;
    const hay=[p.name,p.brand,p.article,catName(p.category_id),p.specs,p.keywords].join(" ").toLowerCase();
    return q.every(t=>hay.includes(t));
  });
  if(state.sort==="Цена: по возрастанию")rows=[...rows].sort((a,b)=>Number(a.price)-Number(b.price));
  if(state.sort==="Цена: по убыванию")rows=[...rows].sort((a,b)=>Number(b.price)-Number(a.price));
  return rows;
}

function renderFilters(){
  const brands=[...new Set(state.products.map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
  el.brandFilter.innerHTML=`<option value="all">Все бренды</option>`+brands.map(b=>`<option>${esc(b)}</option>`).join("");
  el.brandFilter.value=state.brand;
  el.maxPrice.value=state.max;
  el.sortFilter.value=state.sort;
  el.searchInput.value=state.q;
  el.clearSearchBtn.classList.toggle("hidden",!state.q);
}

function renderProducts(){
  const rows=filteredProducts();
  el.resultCount.textContent=`${rows.length} товаров`;
  if(!rows.length){
    el.catalogGrid.classList.add("hidden");el.stateBox.classList.remove("hidden");
    el.stateBox.innerHTML=state.products.length
      ?`<h2>Ничего не найдено</h2><p>Измените поиск или фильтры.</p>`
      :`<h2>Каталог готов к первым товарам</h2><p>${priv()?"Добавьте первый товар. Тестовый товар из старого сайта не переносился.":"Скоро здесь появятся товары, фотографии и розничные цены."}</p>`;
    return;
  }
  el.stateBox.classList.add("hidden");el.catalogGrid.classList.remove("hidden");
  el.catalogGrid.innerHTML=rows.map(p=>{
    const im=imgsFor(p.id)[0];const cover=im?publicUrl(im.image_path):"";
    return `<button class="product" data-product="${p.id}">
      <div class="photo">${cover?`<img src="${cover}" alt="${esc(p.name)}">`:`<span style="font-size:34px">▣</span>`}
        <span class="order-tag">${p.active===false?"Скрыт от клиента":"Под заказ"}</span></div>
      <div class="product-info">
        <div class="product-category">${esc(catName(p.category_id))}${p.brand?" · "+esc(p.brand):""}</div>
        <h2>${esc(p.name)}</h2>
        <div class="product-price">${money(p.price)}</div>
        <div class="delivery">◷ ${esc(p.delivery||"Срок уточняется")}</div>
        ${priv()?`<div class="private-price">Закуп: ${money(p.cost)}<span>+${money(Number(p.price)-Number(p.cost))}</span></div>`:""}
      </div></button>`;
  }).join("");
  el.catalogGrid.querySelectorAll("[data-product]").forEach(b=>b.onclick=()=>openDetail(b.dataset.product));
}

function render(){
  renderAuth();renderCategories();renderFilters();renderProducts();
}

function openDetail(id){
  const p=state.products.find(x=>x.id===id);if(!p)return;
  el.detailTitle.textContent=p.name;
  const pics=imgsFor(p.id);
  el.detailContent.innerHTML=`
    ${pics.length?`<div class="detail-photos">${pics.map(i=>`<img src="${publicUrl(i.image_path)}" alt="${esc(p.name)}">`).join("")}</div>`:""}
    <div class="detail-price">${money(p.price)}</div>
    <p class="delivery">◷ Срок поставки: ${esc(p.delivery||"Уточняется")}</p>
    <div class="specs"><div>Бренд <strong>${esc(p.brand||"Не указан")}</strong></div><div>Артикул <strong>${esc(p.article||"Не указан")}</strong></div><p>${esc(p.specs||"Характеристики уточняются")}</p></div>
    <p class="fine">Перед оформлением продавец подтвердит актуальную цену и возможность поставки.</p>
    ${priv()?`<section class="internal">
      <h3>✓ Внутренняя информация</h3>
      <div class="stats"><div>Закуп<strong>${money(p.cost)}</strong></div><div>Маржа<strong>${money(Number(p.price)-Number(p.cost))}</strong></div><div>Маржа, %<strong>${Number(p.price)?(((Number(p.price)-Number(p.cost))/Number(p.price))*100).toFixed(1):0}%</strong></div></div>
      <p><b>Поставщик:</b> ${esc(p.supplier||"Не указан")}</p><p>${esc(p.supplier_address||"")} ${esc(p.supplier_contact||"")}</p>
      <p>Цена проверена: ${esc(p.checked_date||"Не указано")}</p><p>${esc(p.notes||"")}</p>
      <button class="primary" id="editFromDetail">✎ Редактировать</button>
    </section>`:""}
    ${isSeller()?`<button class="primary cart-add" id="addToCartFromDetail">＋ Добавить в корзину</button>`:""}`;
  el.detailDialog.showModal();
  const edit=$("editFromDetail");if(edit)edit.onclick=()=>{el.detailDialog.close();openProduct(p)};
  const add=$("addToCartFromDetail");if(add)add.onclick=()=>{addToCart(p.id);toast("Добавлено в корзину")};
}

function resetProductForm(){
  state.editing=null;state.formImages=[];
  el.productForm.reset();el.productId.value="";el.productDialogTitle.textContent="Новый товар";
  el.fDelivery.value="1 день";el.fCheckedDate.value=new Date().toISOString().slice(0,10);el.fActive.checked=true;
  if(state.cat!=="all")el.fCategory.value=state.cat;
  else if(state.categories[0])el.fCategory.value=state.categories[0].id;
  el.deleteProductBtn.classList.add("hidden");renderFormImages();updateMargin();
}
function openProduct(p=null){
  if(!priv())return;
  resetProductForm();
  if(p){
    state.editing=p;state.formImages=imgsFor(p.id).map(i=>({...i}));
    el.productDialogTitle.textContent="Редактировать товар";el.productId.value=p.id;
    el.fName.value=p.name||"";el.fCategory.value=p.category_id||"";el.fBrand.value=p.brand||"";el.fArticle.value=p.article||"";
    el.fPrice.value=p.price??"";el.fDelivery.value=p.delivery||"";el.fSpecs.value=p.specs||"";el.fKeywords.value=p.keywords||"";
    el.fCost.value=p.cost??"";el.fSupplier.value=p.supplier||"";el.fSupplierAddress.value=p.supplier_address||"";
    el.fSupplierContact.value=p.supplier_contact||"";el.fCheckedDate.value=p.checked_date||"";el.fNotes.value=p.notes||"";
    el.fActive.checked=p.active!==false;el.deleteProductBtn.classList.remove("hidden");
  }
  renderFormImages();updateMargin();el.productDialog.showModal();
}
function renderFormImages(){
  el.photoThumbs.innerHTML=state.formImages.map((i,idx)=>`<div class="thumb"><img src="${i.preview||publicUrl(i.image_path)}" alt=""><button type="button" data-rm="${idx}">Удалить</button></div>`).join("");
  el.photoThumbs.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{state.formImages.splice(Number(b.dataset.rm),1);renderFormImages()});
}
function updateMargin(){el.marginInfo.textContent="Маржа: "+money(Number(el.fPrice.value||0)-Number(el.fCost.value||0));}
function roundRetail(value){return Math.ceil(Number(value||0)/100)*100;}
function applyMarkup(n){el.fPrice.value=roundRetail(Number(el.fCost.value||0)*(1+Number(n)/100));updateMargin();}
document.querySelectorAll("[data-markup]").forEach(b=>b.onclick=()=>applyMarkup(b.dataset.markup));
el.applyManualMarkup.onclick=()=>{const n=Number(el.manualMarkup.value);if(!Number.isFinite(n)||n<0)return toast("Укажи корректный процент",true);applyMarkup(n)};
el.fCost.oninput=updateMargin;el.fPrice.oninput=updateMargin;

el.photoInput.onchange=()=>{
  const files=[...el.photoInput.files||[]];
  if(state.formImages.length+files.length>5){toast("Можно добавить до 5 фото",true);el.photoInput.value="";return;}
  for(const f of files){
    if(f.size>8*1024*1024||!["image/jpeg","image/png","image/webp"].includes(f.type)){toast("Фото JPG, PNG или WebP до 8 МБ",true);continue}
    state.formImages.push({file:f,preview:URL.createObjectURL(f)});
  }
  el.photoInput.value="";renderFormImages();
};

async function uploadNewImages(productId){
  let order=0;const kept=[];
  for(const item of state.formImages){
    if(item.id){kept.push(item);order++;continue;}
    const ext=(item.file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const path=`${productId}/${crypto.randomUUID()}.${ext}`;
    const up=await supabase.storage.from(STORAGE_BUCKET).upload(path,item.file,{cacheControl:"3600",upsert:false});
    if(up.error)throw up.error;
    const ins=await supabase.from("product_images").insert({product_id:productId,image_path:path,sort_order:order}).select().single();
    if(ins.error)throw ins.error;kept.push(ins.data);order++;
  }
  return kept;
}
async function syncRemovedImages(productId){
  const before=imgsFor(productId), keptIds=new Set(state.formImages.filter(i=>i.id).map(i=>i.id));
  const removed=before.filter(i=>!keptIds.has(i.id));
  if(!removed.length)return;
  await supabase.storage.from(STORAGE_BUCKET).remove(removed.map(i=>i.image_path));
  const ids=removed.map(i=>i.id);for(const id of ids){const r=await supabase.from("product_images").delete().eq("id",id);if(r.error)throw r.error;}
}

el.productForm.onsubmit=async e=>{
  e.preventDefault();
  const id=el.productId.value||crypto.randomUUID();
  const cost=Number(el.fCost.value||0),price=Number(el.fPrice.value||0);
  const markup=cost?((price/cost)-1)*100:0;
  const payload={id,name:el.fName.value.trim(),category_id:el.fCategory.value||null,brand:el.fBrand.value.trim()||null,article:el.fArticle.value.trim()||null,
    price,cost,markup,delivery:el.fDelivery.value.trim()||null,specs:el.fSpecs.value.trim()||null,keywords:el.fKeywords.value.trim()||null,
    supplier:el.fSupplier.value.trim()||null,supplier_address:el.fSupplierAddress.value.trim()||null,supplier_contact:el.fSupplierContact.value.trim()||null,
    checked_date:el.fCheckedDate.value||null,notes:el.fNotes.value.trim()||null,active:el.fActive.checked};
  try{
    let r;if(el.productId.value)r=await supabase.from("products").update(payload).eq("id",id);
    else r=await supabase.from("products").insert(payload);
    if(r.error)throw r.error;
    await syncRemovedImages(id);await uploadNewImages(id);
    el.productDialog.close();toast("Товар сохранён");await loadData();
  }catch(err){console.error(err);toast(err.message||String(err),true)}
};

el.deleteProductBtn.onclick=async()=>{
  const id=el.productId.value;if(!id||!confirm("Удалить товар полностью?"))return;
  try{
    const imgs=imgsFor(id);if(imgs.length)await supabase.storage.from(STORAGE_BUCKET).remove(imgs.map(i=>i.image_path));
    const r=await supabase.from("products").delete().eq("id",id);if(r.error)throw r.error;
    el.productDialog.close();toast("Товар удалён");await loadData();
  }catch(e){toast(e.message||String(e),true)}
};

async function addCategory(name,selectAfter=false){
  name=name.trim();if(!name)return null;
  const exists=state.categories.find(c=>c.name.toLowerCase()===name.toLowerCase());
  if(exists){if(selectAfter)el.fCategory.value=exists.id;return exists}
  const maxSort=Math.max(0,...state.categories.map(c=>c.sort_order||0));
  const r=await supabase.from("categories").insert({name,sort_order:maxSort+10,active:true}).select().single();
  if(r.error)throw r.error;await loadData();if(selectAfter)el.fCategory.value=r.data.id;return r.data;
}
el.addCategoryInFormBtn.onclick=async()=>{try{const c=await addCategory(el.newCategoryInForm.value,true);if(c){el.newCategoryInForm.value="";toast("Категория добавлена")}}catch(e){toast(e.message||String(e),true)}};

async function openManage(){
  if(!isOwner())return;el.manageDialog.showModal();
  await Promise.all([loadStaff(),renderCategoryManager(),renderSellerNamesManager()]);
}
async function loadStaff(){
  const r=await supabase.from("staff_roles").select("*").order("email");if(r.error){toast(r.error.message,true);return}
  state.staff=r.data||[];
  el.staffList.innerHTML=state.staff.map(s=>`<div class="member"><span>${esc(s.email)}</span><span>${s.role==="admin"?"Администратор":"Продавец"}</span><span class="actions"><button class="small-btn" data-staff-del="${esc(s.email)}">Удалить</button></span></div>`).join("");
  el.staffList.querySelectorAll("[data-staff-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Удалить доступ сотрудника?"))return;const r=await supabase.from("staff_roles").delete().eq("email",b.dataset.staffDel);if(r.error)toast(r.error.message,true);else{toast("Доступ удалён");loadStaff()}});
}
el.staffForm.onsubmit=async e=>{
  e.preventDefault();const email=el.staffEmail.value.trim().toLowerCase(),role=el.staffRole.value;
  const r=await supabase.from("staff_roles").upsert({email,role},{onConflict:"email"});if(r.error)return toast(r.error.message,true);
  el.staffEmail.value="";toast("Доступ сохранён");loadStaff();
};
async function renderSellerNamesManager(){
  if(!el.sellerNamesList)return;
  const rows=state.sellerNames||[];
  el.sellerNamesList.innerHTML=rows.length?rows.map(x=>`<div class="seller-name-row">
    <input data-seller-name="${x.id}" value="${esc(x.name)}">
    <label class="inline-check"><input type="checkbox" data-seller-active="${x.id}" ${x.active!==false?"checked":""}> Активен</label>
    <div class="actions"><button class="small-btn" data-seller-save="${x.id}">Сохранить</button><button class="small-btn danger-lite" data-seller-del="${x.id}">Удалить</button></div>
  </div>`).join(""):`<p class="fine">Имена ещё не добавлены.</p>`;
  el.sellerNamesList.querySelectorAll("[data-seller-save]").forEach(b=>b.onclick=async()=>{
    const id=b.dataset.sellerSave,name=el.sellerNamesList.querySelector(`[data-seller-name="${id}"]`).value.trim(),active=el.sellerNamesList.querySelector(`[data-seller-active="${id}"]`).checked;
    if(!name)return toast("Укажите имя продавца",true);
    const r=await supabase.from("seller_names").update({name,active}).eq("id",id);if(r.error)return toast(r.error.message,true);
    toast("Имя продавца сохранено");await loadData();renderSellerNamesManager();
  });
  el.sellerNamesList.querySelectorAll("[data-seller-del]").forEach(b=>b.onclick=async()=>{
    if(!confirm("Удалить имя продавца из списка? Старые заказы останутся в истории."))return;
    const r=await supabase.from("seller_names").delete().eq("id",b.dataset.sellerDel);if(r.error)return toast(r.error.message,true);
    toast("Имя удалено");await loadData();renderSellerNamesManager();
  });
}

el.sellerNameForm.onsubmit=async e=>{
  e.preventDefault();const name=el.newSellerName.value.trim();if(!name)return;
  const maxSort=Math.max(0,...state.sellerNames.map(x=>x.sort_order||0));
  const r=await supabase.from("seller_names").insert({name,sort_order:maxSort+10,active:true});
  if(r.error)return toast(r.error.message,true);
  el.newSellerName.value="";toast("Продавец добавлен");await loadData();renderSellerNamesManager();
};

function renderCategoryManager(){
  el.categoryManager.innerHTML=state.categories.map(c=>`<div class="category-row"><span>${esc(c.name)} ${c.active?"":"(скрыта)"}</span><span class="actions"><button class="small-btn" data-cat-toggle="${c.id}">${c.active?"Скрыть":"Показать"}</button><button class="small-btn" data-cat-del="${c.id}">Удалить</button></span></div>`).join("");
  el.categoryManager.querySelectorAll("[data-cat-toggle]").forEach(b=>b.onclick=async()=>{const c=state.categories.find(x=>x.id===b.dataset.catToggle);const r=await supabase.from("categories").update({active:!c.active}).eq("id",c.id);if(r.error)toast(r.error.message,true);else{await loadData();renderCategoryManager()}});
  el.categoryManager.querySelectorAll("[data-cat-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Удалить категорию? У товаров категория станет пустой."))return;const r=await supabase.from("categories").delete().eq("id",b.dataset.catDel);if(r.error)toast(r.error.message,true);else{if(state.cat===b.dataset.catDel)state.cat="all";await loadData();renderCategoryManager()}});
}
el.categoryForm.onsubmit=async e=>{e.preventDefault();try{await addCategory(el.newCategoryName.value);el.newCategoryName.value="";toast("Категория добавлена");renderCategoryManager()}catch(err){toast(err.message||String(err),true)}};


function requireSeller(){
  if(!isSeller())return false;
  if(!state.selectedSellerId){toast("Сначала выберите своё имя справа сверху",true);return false;}
  return true;
}
function cartKey(){return `quatt-cart:${state.email||"guest"}:${state.selectedSellerId||"none"}`;}
function loadCart(){
  if(!isSeller()||!state.selectedSellerId){state.cart=[];renderCartBadge();return;}
  try{state.cart=JSON.parse(localStorage.getItem(cartKey())||"[]");}catch{state.cart=[]}
  renderCartBadge();
}
function saveCart(){if(isSeller()&&state.selectedSellerId)localStorage.setItem(cartKey(),JSON.stringify(state.cart));renderCartBadge();}
function renderCartBadge(){
  if(!el.cartBadge)return;
  const n=state.cart.reduce((a,x)=>a+Number(x.qty||0),0);
  el.cartBadge.textContent=n;el.cartBadge.classList.toggle("hidden",n===0);
}
function addToCart(productId){
  if(!requireSeller())return;
  const p=state.products.find(x=>x.id===productId);if(!p)return;
  const row=state.cart.find(x=>x.product_id===productId);
  if(row)row.qty+=1; else state.cart.push({product_id:p.id,name:p.name,price:Number(p.price||0),qty:1});
  saveCart();
}
function changeQty(productId,delta){
  const row=state.cart.find(x=>x.product_id===productId);if(!row)return;
  row.qty+=delta;if(row.qty<=0)state.cart=state.cart.filter(x=>x.product_id!==productId);saveCart();renderCart();
}
function renderCart(){
  const seller=selectedSeller();
  if(!seller){el.cartItems.innerHTML='<div class="empty compact-empty"><h2>Выберите продавца</h2><p>Справа сверху выберите своё имя.</p></div>';el.cartTotal.textContent="";el.checkoutBtn.disabled=true;return;}
  if(!state.cart.length){
    el.cartItems.innerHTML=`<div class="empty compact-empty"><h2>Корзина ${esc(seller.name)} пуста</h2><p>Добавьте товар из карточки каталога.</p></div>`;
    el.cartTotal.textContent="";el.checkoutBtn.disabled=true;return;
  }
  el.checkoutBtn.disabled=false;
  el.cartItems.innerHTML=state.cart.map(x=>{
    const im=imgsFor(x.product_id)[0];const cover=im?publicUrl(im.image_path):"";
    return `<div class="cart-item">${cover?`<img src="${cover}" alt="">`:`<div></div>`}<div><b>${esc(x.name)}</b><div class="fine">${money(x.price)} × ${x.qty}</div></div><div class="qty"><button data-minus="${x.product_id}">−</button><span>${x.qty}</span><button data-plus="${x.product_id}">+</button></div><button class="small-btn" data-remove="${x.product_id}">Удалить</button></div>`;
  }).join("");
  const total=state.cart.reduce((a,x)=>a+Number(x.price)*Number(x.qty),0);
  el.cartTotal.textContent=`Итого: ${money(total)}`;
  el.cartItems.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>changeQty(b.dataset.minus,-1));
  el.cartItems.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>changeQty(b.dataset.plus,1));
  el.cartItems.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{state.cart=state.cart.filter(x=>x.product_id!==b.dataset.remove);saveCart();renderCart()});
}
function resetCheckoutForm(){
  el.checkoutForm.reset();el.clientName.value="";el.clientPhone.value="";el.orderNote.value="";el.initialStatus.value="interest";
}
async function addHistory(orderId,fromStatus,toStatus,actorName){
  const r=await supabase.from("order_status_history").insert({order_id:orderId,from_status:fromStatus||null,to_status:toStatus,changed_by_email:state.email||null,changed_by_name:actorName||null});
  if(r.error)console.warn("history",r.error);
}
async function createOrder(){
  if(!state.cart.length||!requireSeller())return;
  const seller=selectedSeller();
  const total=state.cart.reduce((a,x)=>a+Number(x.price)*Number(x.qty),0);
  const payload={seller_email:state.email,seller_name_id:seller.id,seller_name:seller.name,client_name:el.clientName.value.trim(),client_phone:el.clientPhone.value.trim()||null,note:el.orderNote.value.trim()||null,status:el.initialStatus.value,total_amount:total};
  const r=await supabase.from("orders").insert(payload).select().single();if(r.error)throw r.error;
  const items=state.cart.map(x=>({order_id:r.data.id,product_id:x.product_id,product_name:x.name,unit_price:x.price,quantity:x.qty,line_total:x.price*x.qty}));
  const ri=await supabase.from("order_items").insert(items);if(ri.error)throw ri.error;
  await addHistory(r.data.id,null,r.data.status,seller.name);
  state.cart=[];saveCart();resetCheckoutForm();return r.data;
}
const statusLabel=s=>({interest:"Клиент интересуется",paid:"Оплачено",ordered:"Заказан у поставщика",arrived:"Прибыл",issued:"Выдан",cancelled:"Отменён"}[s]||s);
const activeStatuses=new Set(["interest","paid","ordered","arrived"]);
function orderInTab(o,tab){return tab==="active"?activeStatuses.has(o.status):tab==="completed"?o.status==="issued":o.status==="cancelled";}
async function loadOrders(adminMode=false){
  let q=supabase.from("orders").select("*,order_items(*),order_status_history(*)").order("created_at",{ascending:false});
  if(!adminMode){
    if(!requireSeller())return [];
    q=q.eq("seller_email",state.email).eq("seller_name_id",state.selectedSellerId);
  }
  const r=await q;if(r.error)throw r.error;state.orders=r.data||[];return state.orders;
}
function historyHtml(o){
  const rows=[...(o.order_status_history||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  if(!rows.length)return '<p class="fine">История пока пустая.</p>';
  return `<div class="status-history">${rows.map(h=>`<div><time>${new Date(h.created_at).toLocaleString("ru-RU")}</time><span>${h.from_status?`${statusLabel(h.from_status)} → `:""}<b>${statusLabel(h.to_status)}</b></span><em>${esc(h.changed_by_name||h.changed_by_email||"")}</em></div>`).join("")}</div>`;
}
async function changeOrderStatus(orderId,newStatus,actorName){
  const order=state.orders.find(x=>x.id===orderId);if(!order)return;
  const old=order.status;if(old===newStatus)return;
  const r=await supabase.from("orders").update({status:newStatus}).eq("id",orderId);if(r.error)throw r.error;
  await addHistory(orderId,old,newStatus,actorName);
}
async function deleteOrder(orderId,orderNumber){
  if(!isAdmin())return;
  if(!confirm(`Удалить заказ №${orderNumber}? Это действие нельзя отменить.`))return;
  const r=await supabase.from("orders").delete().eq("id",orderId);if(r.error)return toast(r.error.message,true);
  toast(`Заказ №${orderNumber} удалён`);await openOrders(true,false);await refreshOrdersBadge(false);
}
function renderOrders(list,adminMode){
  const filtered=list.filter(o=>orderInTab(o,state.orderTab));
  el.ordersList.innerHTML=filtered.length?filtered.map(o=>{
    const readonlySeller=!adminMode&&o.status==="issued";
    const paidClass=o.status==="paid"?" paid-order":"";
    const sellerName=o.seller_name||"Продавец";
    let actions="";
    if(adminMode){
      actions=`<select class="choice" data-order-status="${o.id}">${["interest","paid","ordered","arrived","issued","cancelled"].map(st=>`<option value="${st}" ${o.status===st?"selected":""}>${statusLabel(st)}</option>`).join("")}</select><button class="danger-lite small-btn" data-order-delete="${o.id}" data-order-number="${o.order_number}">Удалить заказ</button>`;
    }else if(!readonlySeller){
      if(o.status==="interest")actions+=`<button class="primary mini" data-seller-status="paid" data-order-id="${o.id}">Отметить оплачено</button>`;
      if(o.status==="cancelled")actions+=`<button class="primary mini" data-seller-status="interest" data-order-id="${o.id}">Возобновить заказ</button>`;
      else if(activeStatuses.has(o.status))actions+=`<button class="small-btn danger-lite" data-seller-status="cancelled" data-order-id="${o.id}">Отменить</button>`;
    }
    return `<div class="order-card${paidClass}"><div class="order-head"><div><strong>Заказ №${esc(o.order_number||"")}</strong><div class="order-meta">${new Date(o.created_at).toLocaleString("ru-RU")} · ${esc(sellerName)}</div></div><div class="order-total">${money(o.total_amount)}</div></div>${o.status==="paid"?'<div class="paid-banner">✓ ОПЛАЧЕНО — требуется обработка</div>':""}<p><b>Клиент:</b> ${esc(o.client_name||"")} ${esc(o.client_phone||"")}</p>${o.note?`<p>${esc(o.note)}</p>`:""}<div class="order-items">${(o.order_items||[]).map(i=>`${esc(i.product_name)} — ${i.quantity} × ${money(i.unit_price)} = ${money(i.line_total)}`).join("<br>")}</div><div class="order-actions">${actions||`<span class="status-pill">${statusLabel(o.status)}</span>`}<button class="small-btn" data-history-toggle="${o.id}">История статусов</button></div><div class="history-wrap hidden" data-history="${o.id}">${historyHtml(o)}</div></div>`;
  }).join(""):`<div class="empty compact-empty"><h2>${state.orderTab==="active"?"Активных заказов нет":state.orderTab==="completed"?"Завершённых заказов нет":"Отменённых заказов нет"}</h2></div>`;
  el.ordersList.querySelectorAll("[data-history-toggle]").forEach(b=>b.onclick=()=>el.ordersList.querySelector(`[data-history="${b.dataset.historyToggle}"]`).classList.toggle("hidden"));
  if(adminMode){
    el.ordersList.querySelectorAll("[data-order-status]").forEach(sel=>sel.onchange=async()=>{try{const order=state.orders.find(x=>x.id===sel.dataset.orderStatus);await changeOrderStatus(order.id,sel.value,"Администратор");toast("Статус заказа обновлён");await openOrders(true,false);await refreshOrdersBadge(false)}catch(e){toast(e.message||String(e),true)}});
    el.ordersList.querySelectorAll("[data-order-delete]").forEach(b=>b.onclick=()=>deleteOrder(b.dataset.orderDelete,b.dataset.orderNumber));
  }else{
    el.ordersList.querySelectorAll("[data-seller-status]").forEach(b=>b.onclick=async()=>{try{const seller=selectedSeller();await changeOrderStatus(b.dataset.orderId,b.dataset.sellerStatus,seller?.name||"Продавец");toast(b.dataset.sellerStatus==="paid"?"Заказ отмечен как оплаченный":b.dataset.sellerStatus==="cancelled"?"Заказ отменён":"Заказ возобновлён");await openOrders(false,false)}catch(e){toast(e.message||String(e),true)}});
  }
}
async function openOrders(adminMode,show=true){
  try{
    const rows=await loadOrders(adminMode);
    el.ordersDialog.dataset.adminMode=adminMode?"1":"0";
    el.ordersDialogTitle.textContent=adminMode?"Заказы":"Мои заказы";
    el.ordersDialogSub.textContent=adminMode?"Все заказы продавцов.":`Заказы продавца: ${selectedSeller()?.name||"не выбран"}.`;
    renderOrderTabs();renderOrders(rows,adminMode);if(show)el.ordersDialog.showModal();
  }catch(e){toast(e.message||String(e),true)}
}
function renderOrderTabs(){
  el.orderTabs.querySelectorAll("[data-order-tab]").forEach(b=>b.classList.toggle("active",b.dataset.orderTab===state.orderTab));
}
el.orderTabs.querySelectorAll("[data-order-tab]").forEach(b=>b.onclick=()=>{state.orderTab=b.dataset.orderTab;renderOrderTabs();renderOrders(state.orders,el.ordersDialog.dataset.adminMode==="1")});
async function refreshOrdersBadge(notify=true){
  if(!isAdmin()){el.ordersBadge.classList.add("hidden");return;}
  const r=await supabase.from("orders").select("id,status,order_number,seller_name");if(r.error)return;
  const paid=(r.data||[]).filter(o=>o.status==="paid");
  el.ordersBadge.textContent=paid.length;el.ordersBadge.classList.toggle("hidden",paid.length===0);
  const key=`quatt-paid-seen:${state.email}`;let seen=[];try{seen=JSON.parse(localStorage.getItem(key)||"[]")}catch{}
  const known=new Set(seen),fresh=paid.filter(o=>!known.has(o.id));
  if(state.paidSeenReady&&notify)fresh.slice(0,3).forEach(o=>toast(`Оплачен заказ №${o.order_number}${o.seller_name?" · "+o.seller_name:""}`));
  localStorage.setItem(key,JSON.stringify([...new Set([...seen,...paid.map(o=>o.id)])].slice(-300)));
  state.paidSeenReady=true;
}

el.loginBtn.onclick=()=>el.loginDialog.showModal();
el.loginForm.onsubmit=async e=>{
  e.preventDefault();el.loginError.textContent="";
  const r=await supabase.auth.signInWithPassword({email:el.loginEmail.value.trim(),password:el.loginPassword.value});
  if(r.error){el.loginError.textContent=r.error.message;return}
  state.session=r.data.session;await loadRole();el.loginDialog.close();await loadData();
};
el.logoutBtn.onclick=async()=>{await supabase.auth.signOut();state.session=null;state.role="guest";state.customerMode=false;state.selectedSellerId=null;state.cart=[];await loadData()};
el.customerModeBtn.onclick=()=>{state.customerMode=!state.customerMode;render()};
el.addProductBtn.onclick=()=>openProduct();
el.mobileAddProductBtn.onclick=()=>openProduct();
el.manageBtn.onclick=openManage;el.manageBtnDesktop.onclick=openManage;
el.sellerPicker.onchange=()=>{state.selectedSellerId=el.sellerPicker.value||null;if(state.selectedSellerId)localStorage.setItem(sellerSelectionKey(),state.selectedSellerId);loadCart();renderAuth();};
el.cartBtn.onclick=()=>{if(!requireSeller())return;renderCart();el.cartDialog.showModal()};
el.checkoutBtn.onclick=()=>{if(!state.cart.length||!requireSeller())return;resetCheckoutForm();el.cartDialog.close();el.checkoutDialog.showModal()};
el.checkoutForm.onsubmit=async e=>{e.preventDefault();try{const o=await createOrder();el.checkoutDialog.close();toast(`Заказ №${o.order_number} создан`);await refreshOrdersBadge()}catch(err){toast(err.message||String(err),true)}};
el.ordersBtn.onclick=()=>{state.orderTab="active";openOrders(true)};
el.myOrdersBtn.onclick=()=>{if(!requireSeller())return;state.orderTab="active";openOrders(false)};

el.searchInput.oninput=()=>{state.q=el.searchInput.value;renderFilters();renderProducts()};
el.clearSearchBtn.onclick=()=>{state.q="";renderFilters();renderProducts()};
el.mobileCategory.onchange=()=>{state.cat=el.mobileCategory.value;render()};
el.brandFilter.onchange=()=>{state.brand=el.brandFilter.value;renderProducts()};
el.maxPrice.oninput=()=>{state.max=el.maxPrice.value;renderProducts()};
el.sortFilter.onchange=()=>{state.sort=el.sortFilter.value;renderProducts()};

async function init(){
  const {data}=await supabase.auth.getSession();state.session=data.session;await loadRole();renderAuth();await loadData();await refreshOrdersBadge(false);
  supabase.auth.onAuthStateChange(async(_event,session)=>{state.session=session;await loadRole();await loadData();await refreshOrdersBadge(false)});
  setInterval(()=>{if(isAdmin())refreshOrdersBadge(true)},20000);
  if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

init();
