import {isRateUnit,unitLabel} from './variant-model.js?v=290';
import {identity,buildImportPlan,priceAge} from './admin-data.js?v=290';

export function setupAdminTools(ctx) {
  const {el,state,canEditProducts,openProduct,publicUrl,imgsFor,toast,supabase,ensureExcel,loadData,addCategory,logProductChange,buildProductChanges,money,esc}=ctx;
  const $=id=>document.getElementById(id);
  const notify=()=>el.productForm.dispatchEvent(new Event('input',{bubbles:true}));
  const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  function makeDialog(id,html){const d=document.createElement('dialog');d.id=id;d.innerHTML='<div class="modal-card admin-data-modal">'+html+'</div>';document.body.appendChild(d);d.querySelector('[data-dismiss]').onclick=()=>d.close();return d;}

  // Keep the original selects as the form/draft source of truth.
  const pickers=[['fRelated','Похожие товары','Другие модели на замену — для сравнения. Если не выбирать, сайт подберёт товары той же категории.'],['fBundle','С этим товаром покупают','Дополнения: крепёж, расходники, аксессуары. Этот блок можно оставить пустым.']].map(([id,title,hint])=>{
    const select=el[id], section=document.createElement('section');section.className='wide relation-picker';
    select.parentElement.replaceWith(section);select.hidden=true;select.setAttribute('aria-hidden','true');select.tabIndex=-1;
    section.innerHTML='<h3>'+title+'</h3><p class="fine">'+hint+'</p><div class="relation-selected"></div><details class="relation-options"><summary>Выбрать товары</summary><label class="relation-search-label">Найти товар<input type="search" placeholder="Название, бренд или артикул"></label><div class="relation-results"></div></details><p class="relation-count fine" role="status"></p>';
    section.prepend(select);const search=section.querySelector('input'),results=section.querySelector('.relation-results'),chips=section.querySelector('.relation-selected'),count=section.querySelector('.relation-count');
    const chosen=()=>new Set([...select.selectedOptions].map(o=>o.value));
    function toggle(id,on){const option=[...select.options].find(o=>o.value===id);if(!option)return;if(on&&chosen().size>=6)return toast('Можно выбрать до 6 товаров.',true);option.selected=on;select.dispatchEvent(new Event('change',{bubbles:true}));render();}
    function render(){
      const selected=chosen(),allowed=new Set([...select.options].map(o=>o.value));
      const rows=state.products.filter(p=>allowed.has(p.id)&&p.archived!==true&&identity([p.name,p.brand,p.article].join(' ')).includes(identity(search.value))).sort((a,b)=>Number(selected.has(b.id))-Number(selected.has(a.id))||a.name.localeCompare(b.name,'ru'));
      chips.innerHTML=[...selected].map(id=>{const p=state.products.find(p=>p.id===id);return p?'<button type="button" class="relation-chip" data-remove="'+esc(id)+'" aria-label="Убрать '+esc(p.name)+'">'+esc(p.name)+' <span aria-hidden="true">×</span></button>':'';}).join('')||'<span class="fine">Пока ничего не выбрано</span>';
      results.innerHTML=rows.slice(0,20).map(p=>{const cover=imgsFor(p.id)[0];return '<label class="relation-option"><input type="checkbox" value="'+esc(p.id)+'" '+(selected.has(p.id)?'checked':'')+'>'+(cover?'<img loading="lazy" src="'+publicUrl(cover.image_path)+'" alt="">':'<span class="relation-photo-empty" aria-hidden="true">Q</span>')+'<span><b>'+esc(p.name)+'</b><small>'+esc(p.article||p.brand||'')+'</small></span><strong>'+esc(money(p.price))+'</strong></label>';}).join('')||'<p class="fine">Товары не найдены</p>';
      results.querySelectorAll('input').forEach(input=>input.onchange=()=>toggle(input.value,input.checked));chips.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>toggle(b.dataset.remove,false));
      count.textContent='Выбрано: '+selected.size+' из 6'+(rows.length>20?' · Показаны первые 20. Уточните поиск.':'');
    }
    search.oninput=render;return {render,reset(){search.value='';render();}};
  });

  // Non-blocking duplicate suggestions while typing; database uniqueness is final.
  const duplicateBox=$('duplicateProductHint');
  function duplicateHint(){
    const article=identity($('fArticle').value),name=identity(el.fName.value),brand=identity(el.fBrand.value),id=el.productId.value;
    const matches=state.products.filter(p=>p.id!==id&&((article&&identity(p.article)===article)||(name&&identity(p.name)===name&&(!brand||identity(p.brand)===brand))));
    duplicateBox.hidden=!matches.length;duplicateBox.innerHTML=matches.length?'<strong>'+(article&&matches.some(p=>identity(p.article)===article)?'Этот артикул уже занят.':'Похожий товар уже есть.')+'</strong><span>Откройте существующий товар, чтобы проверить или обновить цену.</span>'+matches.slice(0,3).map(p=>'<button class="small-btn" type="button" data-existing="'+esc(p.id)+'">Открыть '+esc(p.name)+'</button>').join(''):'';
    duplicateBox.querySelectorAll('[data-existing]').forEach(b=>b.onclick=async()=>{if(!confirm('Открыть существующий товар? Текущая форма останется в локальном черновике.'))return;await ctx.flushDraft?.();openProduct(state.products.find(p=>p.id===b.dataset.existing));});
  }
  for(const node of [$('fArticle'),el.fName,el.fBrand])node.addEventListener('input',duplicateHint);
  function priceHint(){const age=priceAge(el.fCheckedDate.value);$('priceFreshnessHint').textContent=age===null?'Дата проверки не указана.':age>=30?'Цена не проверялась '+age+' дней. Проверьте её у поставщика.':'Цена проверена '+age+' дн. назад.';}
  el.fCheckedDate.addEventListener('change',priceHint);

  // Supplier records are private and share the existing editor permissions.
  let suppliers=[],supplierEditId='';
  const directory=makeDialog('supplierDirectoryDialog','<div class="modal-head"><div><h2>Поставщики</h2><p>Выберите поставщика — адрес и контакт подставятся в товар. Изменения справочника не меняют ранее сохранённые товары.</p></div><button class="close" type="button" data-dismiss>×</button></div><div class="supplier-directory-grid"><section><label>Поиск поставщика<input id="supplierSearch" type="search"></label><div id="supplierDirectoryList"></div></section><form id="supplierDirectoryForm"><h3 id="supplierEditTitle">Новый поставщик</h3><label>Название *<input id="supplierName" required maxlength="180"></label><label>Адрес<input id="supplierAddress" maxlength="500"></label><label>Контакт<input id="supplierContact" maxlength="300"></label><div class="template-actions"><button class="primary" type="submit">Сохранить поставщика</button><button class="small-btn" id="supplierNew" type="button">Новый</button></div><p id="supplierDirectoryStatus" role="status"></p></form></div>');
  function supplierRows(){
    const stored=new Set(suppliers.map(s=>identity(s.name)));const legacy=[];
    for(const p of state.products){const name=String(p.supplier||'').trim();if(name&&!stored.has(identity(name))){stored.add(identity(name));legacy.push({id:'legacy:'+legacy.length,name,address:p.supplier_address||'',contact:p.supplier_contact||'',legacy:true});}}
    return [...suppliers,...legacy].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  }
  function syncSuppliers(){const current=$('supplierPicker').value;$('supplierPicker').innerHTML='<option value="">Выберите поставщика</option>'+supplierRows().map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+(s.address?' · '+esc(s.address):'')+'</option>').join('');$('supplierPicker').value=current;}
  async function loadSuppliers(){
    if(!canEditProducts())return;
    const r=await supabase.from('suppliers').select('*').order('name');
    if(r.error){$('supplierDirectoryStatus').textContent='Не удалось загрузить справочник: '+r.error.message;return;}
    suppliers=r.data||[];syncSuppliers();renderSuppliers();
  }
  function chooseSupplier(s){el.fSupplier.value=s.name;el.fSupplierAddress.value=s.address||'';el.fSupplierContact.value=s.contact||'';notify();}
  function renderSuppliers(){
    const rows=supplierRows().filter(s=>identity([s.name,s.address,s.contact].join(' ')).includes(identity($('supplierSearch').value)));
    $('supplierDirectoryList').innerHTML=rows.map(s=>'<div class="supplier-directory-row"><strong>'+esc(s.name)+'</strong><span>'+esc([s.address,s.contact].filter(Boolean).join(' · '))+'</span><div><button type="button" class="small-btn" data-supplier-pick="'+esc(s.id)+'">Выбрать</button><button type="button" class="small-btn" data-supplier-edit="'+esc(s.id)+'">Редактировать</button></div></div>').join('')||'<p class="fine">Поставщики не найдены. Добавьте первого справа.</p>';
    $('supplierDirectoryList').querySelectorAll('[data-supplier-pick]').forEach(b=>b.onclick=()=>{chooseSupplier(supplierRows().find(s=>s.id===b.dataset.supplierPick));directory.close();});
    $('supplierDirectoryList').querySelectorAll('[data-supplier-edit]').forEach(b=>b.onclick=()=>{const s=supplierRows().find(s=>s.id===b.dataset.supplierEdit);supplierEditId=s.legacy?'':s.id;$('supplierName').value=s.name;$('supplierAddress').value=s.address||'';$('supplierContact').value=s.contact||'';$('supplierEditTitle').textContent='Редактировать поставщика';});
  }
  $('supplierPicker').onchange=()=>{const s=supplierRows().find(s=>s.id===$('supplierPicker').value);if(s)chooseSupplier(s);};
  $('openSupplierDirectory').onclick=()=>{directory.showModal();loadSuppliers();};
  $('supplierSearch').oninput=renderSuppliers;
  $('supplierNew').onclick=()=>{supplierEditId='';$('supplierDirectoryForm').reset();$('supplierEditTitle').textContent='Новый поставщик';};
  $('supplierDirectoryForm').onsubmit=async e=>{
    e.preventDefault();if(!canEditProducts())return;
    const button=e.submitter||$('supplierDirectoryForm').querySelector('button[type="submit"]');button.disabled=true;
    try{
      const payload={name:$('supplierName').value.trim(),address:$('supplierAddress').value.trim(),contact:$('supplierContact').value.trim()};if(!payload.name)throw new Error('Укажите название поставщика');
      const match=suppliers.find(s=>identity(s.name)===identity(payload.name));const id=supplierEditId||match?.id;
      const r=id?await supabase.from('suppliers').update(payload).eq('id',id):await supabase.from('suppliers').insert(payload);if(r.error)throw r.error;
      await loadSuppliers();$('supplierDirectoryStatus').textContent='Поставщик сохранён.';supplierEditId='';$('supplierDirectoryForm').reset();$('supplierEditTitle').textContent='Новый поставщик';
    }catch(e){$('supplierDirectoryStatus').textContent=e.code==='23505'?'Поставщик с таким названием уже есть.':e.message;}finally{button.disabled=false;}
  };

  const preview=makeDialog('excelPreviewDialog','<div class="modal-head"><div><h2>Предпросмотр импорта Excel</h2><p>До нажатия «Применить выбранное» товары и цены не меняются. Пустые ячейки существующих товаров сохраняют прежние значения. Артикул из Excel сохраняется; у нового товара с пустым артикулом номер QUATT назначится автоматически. Для немерной длины укажите «н/м» или «Длина уточняется»: стоимость целого прутка будет уточняться через WhatsApp. Для прутков цена и закуп указаны за метр; раскройте размеры для проверки цены целого прутка.</p></div><button class="close" type="button" data-dismiss>×</button></div><p id="excelPreviewSummary" role="status"></p><div class="import-options"><label><input id="importSelectUpdates" type="checkbox"> Выбрать существующие товары для обновления</label><label><input id="importPublishNew" type="checkbox"> Показывать новые товары в каталоге сразу</label></div><div class="import-table-wrap"><table class="import-preview-table"><thead><tr><th>Выбрать</th><th>Строка</th><th>Товар / артикул</th><th>Действие</th><th>Розничная цена</th><th>Закуп</th></tr></thead><tbody id="excelPreviewRows"></tbody></table></div><p id="excelImportStatus" role="status"></p><button id="applyExcelPreview" class="primary" type="button">Применить выбранное</button>');
  let plan=[],busy=false;
  function renderPreview(){
    const counts={new:0,update:0,error:0};plan.forEach(p=>counts[p.kind]++);
    $('excelPreviewSummary').textContent='Новых: '+counts.new+' · Совпадений: '+counts.update+' · Ошибок: '+counts.error+'. Размеры одной группы объединяются в одну карточку. Новые карточки скрыты, пока не включён показ выше.';
    $('excelPreviewRows').innerHTML=plan.map((p,i)=>'<tr class="import-row-'+p.kind+'"><td><input type="checkbox" aria-label="Выбрать строку '+p.line+'" data-import-index="'+i+'" '+(p.selected?'checked':'')+' '+(p.kind==='error'||p.applied||busy?'disabled':'')+'></td><td>'+p.line+'</td><td><b>'+esc(p.name||String(p.source['Название']||'Без названия'))+'</b><small>'+esc(p.sku||'Без артикула')+'</small>'+(p.variantInfo?'<p class="fine">'+esc(p.variantInfo)+'</p><details><summary>Размеры и цены</summary>'+p.payload.variants.map(v=>'<div>'+esc(v.name)+' · '+esc((isRateUnit(v)?v.price_per_m:v.price)==null?'Цена уточняется':money(isRateUnit(v)?v.price_per_m:v.price)+'/'+(isRateUnit(v)?'м':unitLabel(v.unit)))+(v.length_unknown?' · длина и итог уточняются':v.unit==='rod'?' · '+esc(money(v.price))+'/пруток':'')+'</div>').join('')+'</details>':'')+'</td><td>'+esc(p.applied?'Сохранено':p.errors.length?p.errors.join('; '):p.kind==='new'?'Новый товар':'Обновление')+'</td><td>'+esc((p.target?money(p.target.price)+' → ':'')+(p.payload?.price===undefined?'без изменений':money(p.payload.price)))+'</td><td>'+esc((p.target?money(p.target.cost)+' → ':'')+(p.payload?.cost===undefined?'без изменений':money(p.payload.cost)))+'</td></tr>').join('');
    $('excelPreviewRows').querySelectorAll('input').forEach(c=>c.onchange=()=>{plan[Number(c.dataset.importIndex)].selected=c.checked;updateApplyButton();});updateApplyButton();
  }
  function updateApplyButton(){const n=plan.filter(p=>p.selected&&!p.applied&&p.kind!=='error').length;$('applyExcelPreview').disabled=busy||!n;$('applyExcelPreview').textContent=busy?'Импортируем…':'Применить выбранное ('+n+')';}
  $('importSelectUpdates').onchange=()=>{plan.filter(p=>p.kind==='update'&&!p.applied).forEach(p=>p.selected=$('importSelectUpdates').checked);renderPreview();};
  preview.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  el.excelImport.onchange=async()=>{
    const file=el.excelImport.files?.[0];el.excelImport.value='';if(!file||!canEditProducts())return;
    try{
      if(file.size>20*1024*1024)throw new Error('Файл должен быть не больше 20 МБ');
      await ensureExcel();const bytes=await file.arrayBuffer();let input=bytes,options={cellDates:false};
      if(/\.csv$/i.test(file.name)){let text=new TextDecoder('utf-8').decode(bytes);if(text.includes('\uFFFD'))text=new TextDecoder('windows-1251').decode(bytes);input=text;options={...options,type:'string'};}
      const wb=window.XLSX.read(input,options);const rows=window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      if(!rows.length)throw new Error('В первом листе нет строк с товарами');if(rows.length>2000)throw new Error('Загружайте не больше 2000 строк за раз');
      plan=buildImportPlan(rows,state.products,localDay());$('importSelectUpdates').checked=false;$('importPublishNew').checked=false;$('excelImportStatus').textContent='';renderPreview();preview.showModal();
    }catch(e){toast(e.message||'Не удалось прочитать файл',true);}
  };
  $('applyExcelPreview').onclick=async()=>{
    if(busy||!canEditProducts())return;busy=true;preview.querySelector('[data-dismiss]').disabled=true;$('importSelectUpdates').disabled=true;$('importPublishNew').disabled=true;renderPreview();let applied=0;
    try{
      for(const item of plan.filter(p=>p.selected&&!p.applied&&p.kind!=='error')){
        if(!canEditProducts())throw new Error('Недостаточно прав для импорта');
        const payload={...item.payload};
        if(item.category){let cat=state.categories.find(c=>identity(c.name)===identity(item.category));if(!cat)cat=await addCategory(item.category);payload.category_id=cat.id;}
        if(item.kind==='new'){item.newId??=crypto.randomUUID();payload.id=item.newId;payload.active=$('importPublishNew').checked;}
        let query=item.target?supabase.from('products').update(payload).eq('id',item.target.id):supabase.from('products').insert(payload);
        if(item.target?.updated_at)query=query.eq('updated_at',item.target.updated_at);
        const r=await query.select('id,article');if(r.error)throw new Error('Строка '+item.line+': '+(r.error.code==='23505'?'артикул или товар уже существует':r.error.message));
        if(!r.data?.length)throw new Error('Строка '+item.line+': товар изменён другим сотрудником. Откройте файл заново для свежего предпросмотра.');
        if(r.data[0].article){payload.article=r.data[0].article;item.sku=r.data[0].article;}item.applied=true;item.selected=false;applied++;
        await logProductChange(item.target?.id||item.newId,payload.name||item.target?.name,item.target?'update':'create',buildProductChanges(item.target,{...item.target,...payload}));
        $('excelImportStatus').textContent='Сохранено карточек: '+applied;
      }
      $('excelImportStatus').textContent='Готово. Сохранено карточек: '+applied+'. Строки с ошибками не изменялись.';
    }catch(e){$('excelImportStatus').textContent=e.message+'. Уже сохранено в этом запуске: '+applied+'. Остальные строки не применены.';}
    finally{busy=false;preview.querySelector('[data-dismiss]').disabled=false;$('importSelectUpdates').disabled=false;$('importPublishNew').disabled=false;renderPreview();await loadData();}
  };
  const auditButton=document.createElement('button');auditButton.type='button';auditButton.id='priceAuditBtn';auditButton.className='small-btn price-audit-button';document.querySelector('.result-line').insertAdjacentElement('beforebegin',auditButton);
  auditButton.onclick=()=>{state.staleOnly=!state.staleOnly;ctx.render();};
  function catalogLoaded(){const n=state.products.filter(p=>(state.showArchived?p.archived===true:p.archived!==true)&&(priceAge(p.checked_date)===null||priceAge(p.checked_date)>=30)).length;auditButton.hidden=!canEditProducts();auditButton.classList.toggle('active',!!state.staleOnly);auditButton.setAttribute('aria-pressed',String(!!state.staleOnly));auditButton.textContent=state.staleOnly?'Показать все товары':'Проверить цены ('+n+')';}
  return {catalogLoaded,refresh(){pickers.forEach(p=>p.reset());duplicateHint();priceHint();syncSuppliers();loadSuppliers();},sync(){pickers.forEach(p=>p.render());duplicateHint();priceHint();syncSuppliers();}};
}
