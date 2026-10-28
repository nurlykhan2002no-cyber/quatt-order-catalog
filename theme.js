// Run before CSS to avoid a light flash on devices using the dark theme.
(()=>{
  const media=matchMedia('(prefers-color-scheme: dark)');let choice='system';
  try{choice=localStorage.getItem('quatt-theme')||'system';}catch{}
  if(!['system','light','dark'].includes(choice))choice='system';
  function apply(){const dark=choice==='dark'||choice==='system'&&media.matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';}
  apply();media.addEventListener('change',apply);
  document.addEventListener('DOMContentLoaded',()=>{
    const selects=[...document.querySelectorAll('[data-theme-choice]')];
    function labels(){const kk=document.documentElement.lang==='kk';selects.forEach(select=>{select.setAttribute('aria-label',kk?'Көрініс тақырыбы':'Тема оформления');select.previousElementSibling.textContent=kk?'Тақырып':'Тема';select.options[0].textContent=kk?'◐ Авто':'◐ Авто';select.options[1].textContent=kk?'☀ Ашық':'☀ Светлая';select.options[2].textContent=kk?'☾ Қараңғы':'☾ Тёмная';});}
    selects.forEach(select=>{select.value=choice;select.onchange=()=>{choice=select.value;selects.forEach(s=>s.value=choice);try{localStorage.setItem('quatt-theme',choice);}catch{}apply();};});
    labels();new MutationObserver(labels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  });
})();
