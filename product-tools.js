import {setupVariantEditor} from "./variant-editor.js?v=289";
import {setupAdminTools} from "./admin-tools.js?v=289";
// Product drafts stay in this browser, isolated by the signed-in account.
const FIELD_IDS = ['fName','fArticle','fCategory','fBrand','fPrice','fPriceMode','fAvailability','fStockQty','fBadge','fDelivery','fOldPrice','fSaleEnd','fSpecs','fVariants','fVariantCosts','fVideoUrl','fCost','fSupplier','fSupplierAddress','fSupplierContact','fCheckedDate','fNotes','fActive','fRelated','fBundle'];
export function templateFields(name) {
  const n = String(name).toLowerCase();
  if (/унитаз/.test(n)) return ['Размер, мм','Тип выпуска','Установка','Материал','Цвет','Комплектация','Гарантия'];
  if (/смесител|сантех/.test(n)) return ['Материал','Назначение','Монтаж','Диаметр подключения','Цвет','Комплектация','Гарантия'];
  if (/свет|электр|ламп/.test(n)) return ['Мощность, Вт','Напряжение, В','Размер, мм','Степень защиты','Цветовая температура, К','Гарантия'];
  if (/крас|грунт|лак/.test(n)) return ['Назначение','Объём, л','Цвет','Расход','Время высыхания','Основа'];
  if (/креп|саморез|болт/.test(n)) return ['Размер, мм','Материал','Покрытие','Количество в упаковке','Назначение'];
  return ['Размер','Материал','Цвет','Комплектация','Гарантия'];
}
export function appendTemplate(specs, fields) {
  const fieldKey = value=>value.trim().toLowerCase().replace(/,.*$/, '').trim();
  const present = new Set(String(specs).split(/\r?\n/).map(line=>fieldKey(line.split(/[:：]/)[0])));
  const missing = fields.filter(field=>!present.has(fieldKey(field)));
  return [String(specs).trimEnd(), ...missing.map(field=>field+': ')].filter(Boolean).join('\n');
}
export function setupProductTools(ctx) {
  const {el,state,canEditProducts,openProduct,renderFormImages,renderRelationOptions,setSelectedValues,updateMargin,renderBadgePreview,publicUrl,imgsFor,decodeImageSafely,toast}=ctx;
  const variantEditor=setupVariantEditor(ctx);
  const adminTools=setupAdminTools({...ctx,flushDraft:()=>flush()});
  const $ = id=>document.getElementById(id);
  const status = $('productDraftStatus');
  let key='', baseline='', queuedSignature='', stopped=false, timer, generation=0, queue=Promise.resolve(), lastDraft=null;
  const dbPromise = new Promise((resolve,reject)=>{
    const req=indexedDB.open('quatt-product-drafts',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('drafts');
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
  // A browser may disallow local storage; keep the editor usable and report it.
  dbPromise.catch(()=>{});
  async function store(mode, action) {
    const db=await dbPromise;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts',mode), req=action(tx.objectStore('drafts'));
      tx.oncomplete=()=>resolve(req.result); tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error||new Error('Хранилище недоступно'));
    });
  }
  function fields() {
    return Object.fromEntries(FIELD_IDS.map(id=>{
      const node=$(id); return [id,node.multiple?[...node.selectedOptions].map(o=>o.value):node.type==='checkbox'?node.checked:node.value];
    }));
  }
  function snapshot() {
    return {fields:fields(), images:state.formImages.map(i=>i.file?{file:i.file}:{id:i.id,image_path:i.image_path,product_id:i.product_id,sort_order:i.sort_order}), updated:Date.now()};
  }
  function signature(s) { return JSON.stringify([s.fields,s.images.map(i=>[i.id,i.image_path,i.file?.name,i.file?.size,i.file?.lastModified])]); }
  function report(message) { status.textContent=message; }
  function changed() {
    if(stopped||!key||!el.productDialog.open||!canEditProducts())return;
    if(signature(snapshot())===queuedSignature)return;
    report('Сохраняем черновик…'); clearTimeout(timer); timer=setTimeout(flush,250);
  }
  function flush() {
    clearTimeout(timer);
    if(stopped||!key||!canEditProducts())return queue;
    const data=snapshot(), sig=signature(data), target=key, token=generation;
    if(sig===queuedSignature)return queue;
    queuedSignature=sig;
    queue=queue.catch(()=>{}).then(()=>store('readwrite',s=>s.put(data,target))).then(()=>{
      if(token===generation){baseline=sig;if(sig===queuedSignature)report('Черновик сохранён на этом устройстве · '+new Date(data.updated).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));}
    }).catch(()=>{if(token===generation){queuedSignature=baseline;report('Не удалось сохранить черновик. Проверьте свободное место и доступ к хранилищу браузера.');}});
    return queue;
  }
  function templateKey(){return 'quatt-spec-templates:'+state.email;}
  function getTemplates(){try{return JSON.parse(localStorage.getItem(templateKey())||'{}')}catch{return {}}}
  function refreshTemplate(){
    const name=state.categories.find(c=>c.id===el.fCategory.value)?.name||'';
    $('templateCategoryName').textContent=name||'Без категории';
    $('templateFields').value=(getTemplates()[el.fCategory.value]||templateFields(name)).join('\n');
  }
  async function opened() {
    clearTimeout(timer); generation++; const token=generation; stopped=false;
    key=state.email+':'+(el.productId.value||'new'); baseline=signature(snapshot()); queuedSignature=baseline; lastDraft=null;
    $('restoreProductDraft').hidden=true;
    $('copyProductBtn').hidden=!el.productId.value;
    refreshTemplate(); variantEditor.refresh(); adminTools.refresh(); report('Черновик сохраняется в этом браузере вместе с фотографиями.');
    try{
      const found=await store('readonly',s=>s.get(key));
      if(token!==generation)return;
      if(found){lastDraft=found;$('restoreProductDraft').hidden=false;report('Есть сохранённый черновик от '+new Date(found.updated).toLocaleString('ru-RU')+'. Можно восстановить.');}
    }catch{report('Автосохранение недоступно в этом браузере.');}
  }
  async function saved(){
    stopped=true; clearTimeout(timer); const target=key; generation++;
    await queue.catch(()=>{});
    try{await store('readwrite',s=>s.delete(target));}catch{toast('Товар сохранён, но локальный черновик удалить не удалось.',true);}
    key='';lastDraft=null;
  }
  $('restoreProductDraft').onclick=()=>{
    if(!lastDraft||!canEditProducts())return;
    if(signature(snapshot())!==baseline&&!confirm('Заменить введённые данные сохранённым черновиком?'))return;
    stopped=true;
    for(const i of state.formImages)if(i.preview)URL.revokeObjectURL(i.preview);
    renderRelationOptions(el.productId.value);
    for(const [id,value] of Object.entries(lastDraft.fields)){
      if(!FIELD_IDS.includes(id))continue;
      const node=$(id);
      if(node.multiple)setSelectedValues(node,Array.isArray(value)?value:[]);
      else if(node.type==='checkbox')node.checked=!!value;
      else node.value=String(value??'');
    }
    state.formImages=lastDraft.images.slice(0,5).filter(i=>i.file||state.images.some(current=>current.id===i.id&&current.product_id===el.productId.value)).map(i=>i.file?{file:i.file,preview:URL.createObjectURL(i.file)}:{...i});
    renderFormImages();updateMargin();renderBadgePreview();refreshTemplate();variantEditor.refresh();adminTools.sync();
    baseline=signature(snapshot());queuedSignature=baseline;stopped=false;$('restoreProductDraft').hidden=true;report('Черновик восстановлен. Проверьте данные перед сохранением товара.');
  };
  $('applySpecTemplate').onclick=()=>{
    const rows=[...new Set($('templateFields').value.split(/\r?\n/).map(s=>s.trim().replace(/[:：]\s*$/,'')).filter(Boolean))];
    el.fSpecs.value=appendTemplate(el.fSpecs.value,rows);changed();toast('Недостающие поля добавлены. Заполненные характеристики сохранены.');
  };
  $('saveSpecTemplate').onclick=()=>{
    if(!el.fCategory.value)return toast('Сначала выберите категорию.',true);
    const rows=[...new Set($('templateFields').value.split(/\r?\n/).map(s=>s.trim().replace(/[:：]\s*$/,'')).filter(Boolean))];
    if(!rows.length||rows.length>20||rows.some(s=>s.length>70))return toast('Укажите от 1 до 20 коротких названий полей.',true);
    try{const templates=getTemplates();templates[el.fCategory.value]=rows;localStorage.setItem(templateKey(),JSON.stringify(templates));toast('Шаблон категории сохранён в этом браузере.');}catch{toast('Не удалось сохранить шаблон.',true);}
  };
  $('copyProductBtn').onclick=async()=>{
    const source=state.editing;if(!source||!canEditProducts())return;
    const button=$('copyProductBtn');button.disabled=true;
    try{
      await flush();
      const existing=await store('readonly',s=>s.get(state.email+':new'));
      if(existing&&!confirm('Есть черновик нового товара. Заменить его копией этого товара?'))return;
      const copies=await Promise.all(imgsFor(source.id).slice(0,5).map(async(i,index)=>{
        const res=await fetch(publicUrl(i.image_path));if(!res.ok)throw new Error('Не удалось скопировать фотографию. Проверьте интернет.');
        const blob=await res.blob();const file=await decodeImageSafely(new File([blob],'copy-'+index,{type:blob.type||'image/webp'}));return {file,preview:URL.createObjectURL(file)};
      }));
      openProduct(source);state.editing=null;el.productId.value='';state.formImages=copies;
      el.fName.value=(source.name||'Товар')+' — копия';$('fArticle').value='';el.fStockQty.value='';el.fBadge.value='';el.fOldPrice.value='';el.fSaleEnd.value='';el.fCheckedDate.value='';el.fActive.checked=false;
      el.productDialogTitle.textContent='Новый товар из копии';
      for(const id of ['deleteProductBtn','productHistoryBtn','priceHistoryBtn','archiveProductBtn'])el[id].classList.add('hidden');
      renderFormImages();renderBadgePreview();await opened();baseline='';queuedSignature='';await flush();lastDraft=null;$('restoreProductDraft').hidden=true;
      report('Копия в черновике. Проверьте модель, цену, наличие и фотографии. Включите показ в каталоге перед публикацией.');
      el.fName.focus();el.fName.select();
    }catch(e){toast(e.message||'Не удалось создать копию.',true);}finally{button.disabled=false;}
  };
  el.fCategory.addEventListener('change',refreshTemplate);
  el.productForm.addEventListener('input',changed);el.productForm.addEventListener('change',changed);
  el.productForm.addEventListener('click',e=>{if(e.target.closest('[data-markup],#applyManualMarkup'))changed();});
  el.productDialog.addEventListener('close',()=>flush());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&el.productDialog.open)flush();});
  window.addEventListener('pagehide',()=>{if(el.productDialog.open)flush();});
  return {opened,changed,flush,saved,validateVariants:()=>variantEditor.validate(),catalogLoaded:()=>adminTools.catalogLoaded()};
}
