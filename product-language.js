const abbreviations=new Set(['ПВХ','ПВЛ','МДФ','ДСП','ЛДСП','ОСП','ГКЛ','ГКЛВ','ГКЛО','ГОСТ','ТУ','СВП','XPS','OSB']);
export function normalizeProductName(value){
  const text=String(value||'').trim().replace(/\s+/g,' ').replace(/[\p{L}\p{N}]+/gu,word=>/^[\p{Script=Cyrillic}]+$/u.test(word)&&word===word.toLocaleUpperCase('ru')&&!abbreviations.has(word)?word.toLocaleLowerCase('ru'):word);
  return text?text[0].toLocaleUpperCase('ru')+text.slice(1):'';
}
const reviewedNames={
  'стальная ванна':'Болат ванна','акриловая ванна':'Акрил ванна','гипсокартон':'Гипсокартон',
  'osb влагостойкая':'Ылғалға төзімді OSB тақтасы','сетка рабица':'Рабица торы','сетка кладочная':'Қалау торы',
  'полоса стальная (металлическая)':'Болат жолақ','квадрат стальной (металлический)':'Шаршы болат шыбық',
  'балка двутавровая':'Қос таврлы болат арқалық','швеллер стальной':'Болат швеллер','уголок стальной (металлический)':'Болат бұрыштық',
  'лист пвл (просечно-вытяжной лист)':'ПВЛ болат табағы',
  'лист горячекатанный рифленный':'Ыстықтай илектелген бедерлі болат табақ','лист горячекатанный':'Ыстықтай илектелген болат табақ',
  'лист холоднокатанный':'Суықтай илектелген болат табақ','лист оцинкованный':'Мырышталған болат табақ',
  'трубы стальные профильные':'Болат профильді құбырлар','трубы стальные электросварные':'Электрмен дәнекерленген болат құбырлар',
  'трубы стальные водогазопроводные':'Су мен газға арналған болат құбырлар','круг металлический (стальной)':'Дөңгелек болат шыбық',
  'арматура а500с':'А500С арматурасы'
};
export function reviewedKazakhName(value){
  const text=String(value||'').trim().replace(/\s+/g,' '),known=reviewedNames[text.toLocaleLowerCase('ru')];if(known)return known;
  for(const [pattern,format] of [
    [/^Водонагреватель электрический\s+(.+)$/i,m=>m[1]+' электр су жылытқышы'],
    [/^Водонагреватель косвенного нагрева\s+(.+)$/i,m=>m[1]+' жанама қыздырылатын су жылытқышы'],
    [/^Кот[её]л газовый\s+(.+)$/i,m=>m[1]+' газ қазандығы'],
    [/^Кот[её]л\s+(.+)$/i,m=>m[1]+' қазандығы'],
    [/^Унитаз\s+(.+)$/i,m=>m[1]+' унитазы']
  ]){const match=text.match(pattern);if(match)return format(match);}
  return null;
}
export function localizedProductName(p,kk=false){return normalizeProductName(kk?(reviewedKazakhName(p?.name)||p?.name_kk?.trim()||p?.name):p?.name);}
export function localizedCartName(row,product,kk=false){
  const base=row.name_ru||row.name||'',ru=product?.name||'';
  if(product&&base.startsWith(ru))return localizedProductName(product,kk)+base.slice(ru.length);
  return kk&&row.name_kk?row.name_kk:base;
}
