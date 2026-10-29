export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const choices = {
 currentState:{no_finish:'Без отделки',white_box:'Предчистовая / White box',old_finish:'Старая отделка',lived_in:'Жилая квартира с ремонтом'},
 targetState:{finish_only:'Чистовая отделка',move_in_ready:'Готовая к проживанию',fully_furnished:'Полностью обустроенная'},
 finishLevel:{budget:'Бюджетный',comfort:'Комфорт',business:'Бизнес'},
 floor:{unknown:'Пока не определено',laminate:'Ламинат',vinyl:'Кварцвинил',parquet:'Паркетная доска',tile:'Плитка'},
 walls:{unknown:'Пока не определено',wallpaper:'Обои',paint:'Покраска',plaster:'Декоративная штукатурка'},
 ceiling:{unknown:'Пока не определено',stretch:'Натяжной',paint:'Покраска',drywall:'Гипсокартон'},
 doors:{unknown:'Пока не определено',standard:'Обычные',concealed:'Скрытого монтажа'},
 demolition:{unknown:'Пока не знаю',full:'Полностью',partial:'Частично',none:'Не требуется'},
 wallPreparation:{unknown:'Пока не знаю',full:'Выравнивание заново',local:'Локальное исправление',ready:'Стены готовы к отделке'},
 floorPreparation:{unknown:'Пока не знаю',new:'Новая стяжка',local:'Локальное выравнивание',ready:'Основание готово'},
 electrical:{unknown:'Пока не знаю',full:'Полная замена',partial:'Частичная замена',keep:'Сохранить существующую'},
 type:{living:'Жилая комната',kitchen:'Кухня',combined_bathroom:'Совмещённый санузел',bathroom:'Ванная',toilet:'Туалет',corridor:'Коридор',wardrobe:'Гардеробная',storage:'Кладовая',other:'Другое помещение'},
 cabinets:{unknown:'Пока не знаю',new:'Новый',keep:'Оставить существующий'},
 facade:{unknown:'Пока не знаю',film:'Плёнка',plastic:'Пластик',enamel:'Эмаль'},
 countertop:{unknown:'Пока не знаю',laminated:'Ламинированная',stone:'Искусственный камень'},
 presence:{none:'Нет',balcony:'Балкон',loggia:'Лоджия',both:'Есть оба'},
 glazing:{unknown:'Пока не знаю',keep:'Оставить существующее',new:'Установить или заменить',none:'Не требуется'},
 insulation:{unknown:'Пока не знаю',yes:'Нужно',no:'Не нужно'}
};
export function select(key,label,value,options=choices[key.split('.').at(-1)]) {
 return `<div class="field"><label for="f-${key}">${esc(label)}</label><select id="f-${key}" data-field="${key}">${Object.entries(options).map(([v,text])=>`<option value="${esc(v)}" ${v===String(value)?'selected':''} ${key==='targetState'&&v==='fully_furnished'?'disabled hidden':''}>${esc(text)}</option>`).join('')}</select></div>`;
}
export function input(key,label,value,{required=false,scale=1,min=0,max=null,text=false}={}){
 return `<div class="field"><label for="f-${key}">${esc(label)}</label><input id="f-${key}" data-field="${key}" value="${esc(value)}" ${text?'maxlength="100"':`inputmode="decimal" data-number="${scale}" data-min="${min}" ${max===null?'':`data-max="${max}"`}`} ${required?'required':''}></div>`;
}
export function check(key,label,value,fallback=false){return `<label class="check"><input type="checkbox" data-field="${key}" ${value===null?`data-inherited="true"`:''} ${(value??fallback)?'checked':''}> ${esc(label)} ${value===null?'<small>(по нормативу)</small>':''}</label>`;}
export function apartmentForm(a){return [select('currentState','Исходное состояние',a.currentState),select('targetState','Целевое состояние',a.targetState),select('finishLevel','Уровень ремонта',a.finishLevel),input('areaM2','Площадь квартиры, м² — без балкона и лоджии',a.areaM2,{required:true}),input('ceilingHeight','Высота потолков, м — пусто: норматив калькулятора',a.ceilingHeight,{scale:2,min:2,max:5}),'<h2>Общая отделка</h2>'+select('redevelopment','Нужна перепланировка?',String(a.redevelopment??false),{true:'Да',false:'Нет'})+'<p>Для комнат, кухни и коридора. Индивидуальная отделка имеет приоритет. Санузлы используют отдельные нормативы.</p>',...['floor','walls','ceiling','doors'].map((key,i)=>select(key,['Пол','Стены','Потолок','Межкомнатные двери'][i],a[key])),'<h2>Работы</h2>',...['demolition','wallPreparation','floorPreparation','electrical'].map((key,i)=>select(key,['Демонтаж отделки','Подготовка стен','Подготовка пола','Электрика'][i],a[key]))].join('');}
export function roomForm(r){const wet=['combined_bathroom','bathroom','toilet'].includes(r.type);return select('type','Тип помещения',r.type)+input('name','Название — необязательно',r.name,{text:true})+input('areaM2','Площадь помещения, м²',r.areaM2)+['floor','walls','ceiling'].map((key,i)=>select(key,['Пол','Стены','Потолок'][i],r[key],{inherit:wet?'Норматив санузла':['living','kitchen','corridor'].includes(r.type)?'Наследовать общую отделку':'Норматив помещения',...choices[key]})).join('');}
export function kitchenForm(k,equipped){
 const selected=k.stove===null?equipped:k.stove!=='none';
 return select('cabinets','Гарнитур',k.cabinets)+(k.cabinets==='new'?input('lengthM','Длина вдоль стен, м — необязательно',k.lengthM)+select('facade','Фасады',k.facade)+select('countertop','Столешница',k.countertop):'')+'<h2>Техника к покупке</h2><p>Снятый флажок — отказ от покупки. Нет ручного выбора — действует норматив целевого состояния.</p>'+check('stoveEnabled','Плита / варочная панель',k.stove===null?null:selected,equipped)+(selected?select('stove','Вид плиты',k.stove??'hob',{hob:'Варочная панель',cooker:'Плита со встроенной духовкой'}):'')+(k.stove==='cooker'?'<p>Встроенная духовка включена в плиту. Отдельная духовка повторно не начисляется.</p>':check('oven','Отдельный духовой шкаф',k.oven,equipped))+check('refrigerator','Холодильник',k.refrigerator,equipped)+check('hood','Вытяжка',k.hood,equipped)+check('dishwasher','Посудомоечная машина',k.dishwasher,equipped)+'<button type="button" data-action="reset-appliances" class="secondary">Вернуть нормативный комплект техники</button>';
}
export function exteriorForm(e,key,label){return `<fieldset><legend>${label}</legend>`+input(key+'.areaM2','Площадь, м² — не входит в площадь квартиры',e.areaM2)+select(key+'.glazing','Остекление',e.glazing)+select(key+'.insulation','Утепление',e.insulation)+select(key+'.floor','Пол',e.floor)+select(key+'.walls','Стены',e.walls)+select(key+'.ceiling','Потолок',e.ceiling,{none:'Не требуется',required:'Выполнить, материал пока не выбран',...choices.ceiling})+check(key+'.lighting','Освещение',e.lighting,true)+check(key+'.sockets','Розетки',e.sockets,true)+`<p>Если площадь не указана, расчёт использует ${key==='balcony'?'3,0':'4,5'} м². Поле остаётся пустым.</p></fieldset>`;}
export function parseDraft(value){
 if(Array.isArray(value))return value.map(parseDraft);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,['areaM2','ceilingHeight','lengthM'].includes(key)?(v===''||v==null?null:Number(String(v).replace(',','.'))):parseDraft(v)]));
 return value;
}
export function fieldValid(input){
 if(input.dataset.number===undefined)return true;
 const raw=input.value.trim();let error='';
 if(!raw){if(input.required)error='Заполните обязательное поле';}
 else {const scale=Number(input.dataset.number);const n=Number(raw.replace(',','.'));if(!new RegExp('^\\d+(?:[.,]\\d{1,'+scale+'})?$').test(raw)||!Number.isFinite(n)||n<=0||n<Number(input.dataset.min)||(input.dataset.max!==undefined&&n>Number(input.dataset.max)))error='Проверьте число и допустимый диапазон';}
 input.setCustomValidity(error);input.setAttribute('aria-invalid',String(!!error));return !error;
}
