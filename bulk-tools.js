export function bulkPatch(product, action, value, roundRetail) {
  if(["markup","percent","fixed","availability"].includes(action)&&Array.isArray(product.variants)&&product.variants.length)throw new Error("Товар с размерами: измените цены и наличие в карточке или через Excel");
  const patch={};
  if(action==='category')patch.category_id=value;
  else if(action==='visibility')patch.active=value==='true';
  else if(action==='availability')patch.availability=value;
  else if(action==='checked')patch.checked_date=value;
  else {
    const n=Number(value);if(value===''||!Number.isFinite(n))throw new Error('Укажите корректное число');
    if(action==='markup'){
      if(n<0||!Number.isFinite(Number(product.cost))||Number(product.cost)<=0)throw new Error('Для наценки нужна закупочная цена больше нуля');
      patch.price=roundRetail(Number(product.cost)*(1+n/100));
    }else if(action==='percent'){
      if(n< -100||!Number.isFinite(Number(product.price))||product.price===null)throw new Error('Изменение цены должно быть не меньше −100%');
      patch.price=roundRetail(Number(product.price)*(1+n/100));
    }else if(action==='fixed'){
      if(n<0)throw new Error('Цена не может быть отрицательной');patch.price=n;
    }else throw new Error('Выберите действие');
    if(!Number.isFinite(patch.price))throw new Error('Слишком большая цена');
    patch.markup=Number(product.cost)>0?Number(((patch.price/Number(product.cost)-1)*100).toFixed(6)):0;
  }
  return Object.fromEntries(Object.entries(patch).filter(([k,v])=>String(product[k]??'')!==String(v??'')));
}

export function setupBulkTools(ctx){
  const {el,state,canEditProducts,money,esc,catName,imgsFor,publicUrl,roundRetail,supabase,loadData,logProductChange,buildProductChanges}=ctx;
  const root=el.bulkDialog.querySelector('.modal-card');
  root.innerHTML=`<div class="modal-head"><div><h2>Массовое редактирование</h2><p>1. Выберите товары → 2. Задайте действие → 3. Проверьте изменения</p></div><button class="close" type="button" aria-label="Закрыть массовое редактирование">×</button></div>
  <div class="bulk-workspace"><section class="bulk-selection"><div class="bulk-filter-grid"><label>Найти товары<input id="bulkSearch" type="search" placeholder="Название, артикул или бренд"></label><label>Категория<select id="bulkFilterCategory" class="choice"></select></label><label>Показ в каталоге<select id="bulkFilterVisibility" class="choice"><option value="">Все</option><option value="true">Показаны</option><option value="false">Скрыты</option></select></label></div><div class="bulk-select-bar"><button id="bulkPickFiltered" class="small-btn" type="button">Выбрать найденные</button><button id="bulkClearSelection" class="small-btn" type="button">Снять выбор</button><strong id="bulkCount" aria-live="polite"></strong></div><p class="fine">Выбор сохраняется при поиске и смене фильтров. Архивные товары здесь не показываются.</p><div id="bulkRows" class="bulk-products"></div></section>
  <section class="bulk-action-panel"><h3>Что изменить?</h3><label>Действие<select id="bulkAction" class="choice"><option value="markup">Наценка от закупа, %</option><option value="percent">Изменить розничную цену, %</option><option value="fixed">Единая розничная цена, ₸</option><option value="category">Перенести в категорию</option><option value="visibility">Показать / скрыть товары</option><option value="availability">Изменить наличие</option><option value="checked">Указать дату проверки цены</option></select></label><label id="bulkValueLabel"><span id="bulkValueTitle">Наценка, %</span><input id="bulkNumber" type="number" step="any" placeholder="Например, 40"><select id="bulkChoice" class="choice" hidden></select><input id="bulkDate" type="date" hidden></label><p id="bulkActionHelp" class="fine"></p><button id="bulkPreviewBtn" class="primary" type="button">Проверить изменения</button><p id="bulkStatus" role="status" class="fine"></p></section></div>
  <section id="bulkReview" hidden><div class="bulk-review-head"><div><h3>Предпросмотр изменений</h3><p id="bulkReviewSummary" class="fine"></p></div><button id="bulkBack" class="small-btn" type="button">← Изменить выбор</button></div><div class="bulk-review-scroll"><table class="bulk-review-table"><thead><tr><th>Товар</th><th>Было</th><th>Станет</th><th>Результат</th></tr></thead><tbody id="bulkPreviewRows"></tbody></table></div><p class="fine">Сохранятся только строки с изменениями. Остальные поля и дата проверки цены сохраняются, если вы не выбрали их изменение.</p><button id="bulkSave" class="primary" type="button">Сохранить изменения</button><p id="bulkSaveStatus" role="status" class="fine"></p></section>`;
  const $=id=>root.querySelector('#'+id),selected=new Set();let products=[],plan=[],busy=false,reviewTitle='';
  const norm=v=>String(v||'').toLocaleLowerCase('ru').trim();
  const configs={markup:['Наценка, %','Цена = закуп × (1 + наценка / 100), с обычным округлением каталога. Товары без закупа будут пропущены.'],percent:['Изменение, %','Например, 10 — увеличить текущую розничную цену на 10%, −10 — уменьшить на 10%. С обычным округлением каталога.'],fixed:['Новая цена, ₸','Одна и та же розничная цена для всех выбранных товаров.'],category:['Новая категория','Товары будут перенесены в выбранную категорию.'],visibility:['Показ в каталоге','Скрытые товары останутся доступны в админке.'],availability:['Наличие','Количество на складе не меняется.'],checked:['Дата проверки','Указывайте дату, когда вы действительно сверили цену у поставщика.']};
  function filtered(){return products.filter(p=>norm([p.name,p.article,p.brand].join(' ')).includes(norm($('bulkSearch').value))&&(!$('bulkFilterCategory').value||p.category_id===$('bulkFilterCategory').value)&&(!$('bulkFilterVisibility').value||String(p.active!==false)===$('bulkFilterVisibility').value));}
  function counts(){const rows=filtered();$('bulkCount').textContent='Выбрано: '+selected.size+' · Найдено: '+rows.length;$('bulkPreviewBtn').disabled=!selected.size;$('bulkClearSelection').disabled=!selected.size;$('bulkPickFiltered').disabled=!rows.length;}
  function renderRows(){
    const rows=filtered();$('bulkRows').innerHTML=rows.map(p=>{const img=imgsFor(p.id)[0];return `<label class="bulk-item ${selected.has(p.id)?'is-selected':''}"><input type="checkbox" value="${esc(p.id)}" ${selected.has(p.id)?'checked':''} aria-label="Выбрать ${esc(p.name)}">${img?`<img loading="lazy" src="${publicUrl(img.image_path)}" alt="">`:'<span class="bulk-photo-empty">Q</span>'}<span class="bulk-item-info"><b>${esc(p.name)}</b><small>${esc([p.article,catName(p.category_id),p.active===false?'Скрыт':'Показан'].filter(Boolean).join(' · '))}</small></span><span class="bulk-item-price"><b>${esc(money(p.price))}</b><small>Закуп: ${esc(money(p.cost))}</small></span></label>`;}).join('')||'<p class="fine bulk-empty">Товары не найдены. Попробуйте другой запрос или фильтр.</p>';
    $('bulkRows').querySelectorAll('input').forEach(c=>c.onchange=()=>{c.checked?selected.add(c.value):selected.delete(c.value);c.closest('label').classList.toggle('is-selected',c.checked);counts();});counts();
  }
  function actionChanged(){const a=$('bulkAction').value;$('bulkValueTitle').textContent=configs[a][0];$('bulkActionHelp').textContent=configs[a][1];$('bulkNumber').hidden=!['markup','percent','fixed'].includes(a);$('bulkChoice').hidden=!['category','visibility','availability'].includes(a);$('bulkDate').hidden=a!=='checked';$('bulkNumber').value='';$('bulkNumber').min=a==='percent'?'-100':'0';
    $('bulkChoice').innerHTML=a==='category'?'<option value="">Выберите категорию</option>'+state.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''):a==='visibility'?'<option value="true">Показать в каталоге</option><option value="false">Скрыть из каталога</option>':'<option value="in_stock">В наличии</option><option value="order">Под заказ</option><option value="out_of_stock">Нет в наличии</option>';
    $('bulkStatus').textContent='';
  }
  const availability={in_stock:'В наличии',order:'Под заказ',out_of_stock:'Нет в наличии'};
  function describe(p,patch){const a=$('bulkAction').value,k=a==='category'?'category_id':a==='visibility'?'active':a==='availability'?'availability':a==='checked'?'checked_date':'price';const v=patch?{...p,...patch}[k]:p[k];return k==='price'?money(v):k==='category_id'?catName(v):k==='active'?(v===false?'Скрыт':'Показан'):k==='availability'?(availability[v]||v):v||'Не указана';}
  function renderPlan(){
    const n=plan.filter(r=>!r.error&&!r.applied&&Object.keys(r.patch).length).length;
    const saved=plan.filter(r=>r.applied).length,errors=plan.filter(r=>r.error).length;
    $('bulkReviewSummary').textContent=reviewTitle+' · '+(saved?'Сохранено: '+saved+' · Осталось: '+n:'Изменится: '+n+' из '+plan.length)+(errors?' · Пропущено: '+errors:'');
    $('bulkPreviewRows').innerHTML=plan.map(r=>`<tr class="${r.error?'bulk-error':''}"><td>${esc(r.p.name)}</td><td>${esc(describe(r.p))}</td><td>${esc(r.error?'—':describe(r.p,r.patch))}</td><td>${esc(r.applied?'Сохранено':r.error||(!Object.keys(r.patch).length?'Без изменений':'Готово к сохранению'))}</td></tr>`).join('');
    $('bulkSave').disabled=busy||!n;$('bulkSave').textContent=busy?'Сохраняем…':'Сохранить изменения ('+n+')';
  }
  $('bulkSearch').oninput=renderRows;$('bulkFilterCategory').onchange=renderRows;$('bulkFilterVisibility').onchange=renderRows;
  $('bulkPickFiltered').onclick=()=>{filtered().forEach(p=>selected.add(p.id));renderRows();};$('bulkClearSelection').onclick=()=>{selected.clear();renderRows();};$('bulkAction').onchange=actionChanged;
  $('bulkPreviewBtn').onclick=()=>{
    const a=$('bulkAction').value,v=a==='checked'?$('bulkDate').value:['category','visibility','availability'].includes(a)?$('bulkChoice').value:$('bulkNumber').value;
    if(!v){$('bulkStatus').textContent='Укажите '+configs[a][0].toLocaleLowerCase('ru');return;}
    reviewTitle=configs[a][0]+': '+(a==='category'?catName(v):a==='visibility'?(v==='true'?'Показать':'Скрыть'):a==='availability'?availability[v]:v);
    plan=products.filter(p=>selected.has(p.id)).map(p=>{try{return {p:{...p},patch:bulkPatch(p,a,v,roundRetail)};}catch(e){return {p:{...p},patch:{},error:e.message};}});
    root.querySelector('.bulk-workspace').hidden=true;$('bulkReview').hidden=false;$('bulkSaveStatus').textContent='';renderPlan();root.scrollTop=0;
  };
  $('bulkBack').onclick=()=>{root.querySelector('.bulk-workspace').hidden=false;$('bulkReview').hidden=true;renderRows();};
  const close=root.querySelector('.close');close.onclick=()=>{if(!busy)el.bulkDialog.close();};el.bulkDialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  $('bulkSave').onclick=async()=>{
    if(busy||!canEditProducts())return;busy=true;close.disabled=true;$('bulkBack').disabled=true;renderPlan();let saved=0;
    try{
      for(const row of plan.filter(r=>!r.error&&!r.applied&&Object.keys(r.patch).length)){
        if(!canEditProducts())throw new Error('Недостаточно прав');
        let query=supabase.from('products').update(row.patch).eq('id',row.p.id);if(row.p.updated_at)query=query.eq('updated_at',row.p.updated_at);
        const r=await query.select('id');if(r.error)throw new Error(row.p.name+': '+r.error.message);if(!r.data?.length)throw new Error(row.p.name+': товар изменён другим сотрудником. Вернитесь к выбору для свежего предпросмотра.');
        row.applied=true;selected.delete(row.p.id);saved++;await logProductChange(row.p.id,row.p.name,'update',buildProductChanges(row.p,{...row.p,...row.patch}));$('bulkSaveStatus').textContent='Сохранено: '+saved;
      }
      $('bulkSaveStatus').textContent='Готово. Сохранено товаров: '+saved+'.';
    }catch(e){$('bulkSaveStatus').textContent=e.message+' Уже сохранено: '+saved+'. Остальные товары не изменены.';}
    finally{busy=false;close.disabled=false;$('bulkBack').disabled=false;renderPlan();await loadData();products=state.products.filter(p=>!p.archived);}
  };
  return {open(){if(!canEditProducts())return;selected.clear();products=state.products.filter(p=>!p.archived);$('bulkSearch').value='';$('bulkFilterVisibility').value='';$('bulkFilterCategory').innerHTML='<option value="">Все категории</option>'+state.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('bulkAction').value='markup';const d=new Date();$('bulkDate').value=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');actionChanged();root.querySelector('.bulk-workspace').hidden=false;$('bulkReview').hidden=true;renderRows();el.bulkDialog.showModal();root.scrollTop=0;}};
}
