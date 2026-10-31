export function setupProductEditorControls({form,applyMarkup}){
  const status=form.querySelector('#productSaveFeedback');
  function feedback(text,error=false){status.textContent=text;status.hidden=!text;status.classList.toggle('is-error',error);}
  function saving(active){form.dataset.saving=active?'1':'0';for(const button of form.querySelectorAll('button[type="submit"]')){button.disabled=active;if(!button.dataset.saveLabel)button.dataset.saveLabel=button.textContent;button.textContent=active?'Сохраняем…':button.dataset.saveLabel;}}
  function save(){if(form.dataset.saving==='1')return;feedback('');form.requestSubmit(form.querySelector('#saveProductTop')||form.querySelector('button[type="submit"]'));}
  form.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||e.isComposing||e.repeat)return;
    const target=e.target,shortcut=e.ctrlKey||e.metaKey;
    if(!shortcut&&(target.tagName==='TEXTAREA'||target.isContentEditable||target.closest('button,a,summary')||target.matches('input[type="file"],input[type="checkbox"],input[type="radio"]')))return;
    e.preventDefault();e.stopPropagation();
    if(target.id==='manualMarkup')applyMarkup();
    save();
  },true);
  let invalidPending=false;
  form.addEventListener('invalid',e=>{
    e.preventDefault();if(invalidPending)return;invalidPending=true;queueMicrotask(()=>invalidPending=false);
    const input=e.target;for(let node=input.parentElement;node&&node!==form;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
    const label=input.getAttribute('aria-label')||input.closest('label')?.firstChild?.textContent?.trim()||'Поле товара';
    feedback('Не сохранено. '+label+': '+input.validationMessage,true);input.focus({preventScroll:true});input.scrollIntoView({block:'center',behavior:'instant'});
  },true);
  form.querySelectorAll('[data-editor-section]').forEach(button=>button.onclick=()=>{
    const found=form.querySelector(button.dataset.editorSection),target=found?.closest('label')||found;if(target)target.scrollIntoView({block:'start',behavior:'instant'});
  });
  return {feedback,saving};
}
