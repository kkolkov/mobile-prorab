import zipfile,xml.etree.ElementTree as E,re,json
from pathlib import Path
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile('Сбор_данных_для_калькулятора.xlsx') as z:
 shared=[]
 if 'xl/sharedStrings.xml' in z.namelist():shared=[''.join(t.text or '' for t in r.findall('.//s:t',N)) for r in E.fromstring(z.read('xl/sharedStrings.xml'))]
 rel={r.get('Id'):r.get('Target') for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 result={}
 for s in E.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',N):
  target=rel[s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')];target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  rows=[]
  for r in E.fromstring(z.read(target)).findall('s:sheetData/s:row',N):
   cells={}
   for c in r:
    v=c.find('s:v',N);val=v.text if v is not None else ''.join(t.text or '' for t in c.findall('.//s:t',N))
    if c.get('t')=='s':val=shared[int(val)]
    if val:cells[re.sub(r'\d','',c.get('r'))]=val
   if cells:rows.append({'row':int(r.get('r')),**cells})
  result[s.get('name')]=rows

# Explicit semantic mapping: broad workbook categories are not individual operations.
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
import hashlib
old={r['code']:r for r in json.loads(Path('backend/src/main/resources/pricing/import-2026-10-28.json').read_text())}
observations={r['row']:r for r in result['Наблюдения_цен']}
extras={r['row']:r for r in result['Доп_расценки']}
rows=[]
def add(code,title,unit,price,row,sheet,source,date,note='',labor=True):
    price=Decimal(str(price)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
    assert price>0
    day=(datetime(1899,12,30)+timedelta(days=int(date))).date().isoformat()
    rows.append(dict(code=code,title=title,unit=unit,price=str(price),rough='0',labor='1' if labor else '0',
      source=f'Сбор_данных_для_калькулятора.xlsx, {sheet}!{row}. Москва. Дата из файла: {day}; онлайн-актуальность при импорте не проверялась. {source}. {note}',date=day,sheet=sheet,row=row,new=code not in old))
def observation(n,code,title=None,unit=None,note=''):
    r=observations[n];assert r.get('G') and 'пример' not in r.get('B','').lower()
    definition=old.get(code,{})
    add(code,title or definition['title'],unit or definition['unit'],r['G'],n,'Наблюдения_цен',r['C']+' '+r['F']+' '+r.get('I',''),r['E'],note)
for n,code in [(6,'average.work.laminate'),(7,'average.work.parquet'),(9,'average.work.tile_floor'),(10,'ref.L_door_entrance'),(11,'ref.L_door_ordinary'),(14,'average.work.paint_wall'),(15,'average.work.tile_wall'),(16,'average.work.wallpaper'),(17,'ref.L_light'),(21,'ref.L_washer'),(24,'ref.L_bath'),(26,'ref.L_basin_single'),(27,'ref.L_wc')]:
    observation(n,code,note=('В Доп_расценки!18 указано 3060 без источника; принята конкретная ставка 3460 со ссылкой из Наблюдения_цен!27.' if n==27 else 'Только работа; материалы отдельно.'))
for n,code,title,unit in [
 (8,'ref.L_vinyl_glue','Клеевая укладка кварцвинила / плитки ПВХ','м²'),
 (12,'ref.L_heat_mat','Укладка нагревательного мата','м²'),
 (13,'ref.L_heat_cable','Укладка кабельного тёплого пола','м²'),
 (18,'ref.L_kitchen_hob','Подключение электрической варочной панели','шт.'),
 (19,'ref.L_kitchen_oven','Подключение электрического духового шкафа','шт.'),
 (20,'ref.L_kitchen_hood','Монтаж и подключение вытяжки','шт.'),
 (22,'ref.L_kitchen_fridge','Установка и подключение встраиваемого холодильника','шт.'),
 (23,'ref.L_kitchen_dishwasher','Подключение посудомоечной машины','шт.'),
 (25,'ref.L_mixer_thermostat','Установка смесителя с термостатом','шт.'),
 (28,'ref.L_wc_installation','Монтаж рамы инсталляции и подвесного унитаза — комплект','компл.')]:
    observation(n,code,title,unit,'Только работа; техника/материалы отдельно. Не заменяет операции с иным составом.')
for n,kind in [(6,'ordinary'),(7,'hidden'),(8,'entrance')]:
    r=extras[n]
    add('ref.D_'+kind+'_budget',old['ref.D_'+kind+'_budget']['title'],old['ref.D_'+kind+'_budget']['unit'],r['C'],n,'Доп_расценки',r['G']+' '+r['F'],r['I'],'Материал без монтажа. Эконом-позиция: обновлён только бюджетный класс; не распространяется на комфорт/бизнес. Состав по строке файла, дополнительные комплектующие не подтверждены.',labor=False)
    if kind=='hidden':
        add('ref.L_door_hidden',old['ref.L_door_hidden']['title'],'шт.',r['D'],n,'Доп_расценки',r['G']+' '+r['F'],r['I'],'Работа 7020 указана в отдельной колонке файла; строка наблюдений установки обычной двери не начисляется дополнительно.')
# Retire only synonyms of the very same base operation. Distinct methods/sizes stay distinct.
aliases={'ref.L_laminate':'average.work.laminate','ref.L_paper':'average.work.wallpaper','ref.L_paint_w':'average.work.paint_wall','ref.L_tile_floor_normal':'average.work.tile_floor','ref.L_tile_wall_normal':'average.work.tile_wall'}
assert len({r['code'] for r in rows})==len(rows)
assert len(rows)==27
output={'workbook':'Сбор_данных_для_калькулятора.xlsx','sha256':hashlib.sha256(Path('Сбор_данных_для_калькулятора.xlsx').read_bytes()).hexdigest(),'rows':rows,'aliases':aliases}
Path('backend/src/main/resources/pricing/workbook-2026-10-29.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print('Rows:',len(rows),'updates:',sum(not r['new'] for r in rows),'new:',sum(r['new'] for r in rows),'retired synonyms:',len(aliases))
