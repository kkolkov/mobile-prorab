"""Reproducible one-off XLSX -> versioned seed. No Excel dependency, no database writes."""
import json, re, zipfile, xml.etree.ElementTree as E
from pathlib import Path
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def book(path):
    with zipfile.ZipFile(path) as z:
        ss=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            ss=[''.join(t.text or '' for t in x.findall('.//s:t',NS)) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
        sheets={}
        names=[s.get('name') for s in E.fromstring(z.read('xl/workbook.xml')).findall('.//s:sheet',NS)]
        for i,name in enumerate(names,1):
            rows=[]
            for row in E.fromstring(z.read(f'xl/worksheets/sheet{i}.xml')).findall('.//s:sheetData/s:row',NS):
                cells={}
                for c in row:
                    v=c.find('s:v',NS)
                    value=v.text if v is not None else ''.join(t.text or '' for t in c.findall('.//s:t',NS))
                    if c.get('t')=='s':value=ss[int(value)]
                    cells[re.sub(r'\d','',c.get('r'))]=value or ''
                rows.append(cells)
            comments={}
            if f'xl/comments{i}.xml' in z.namelist():
                for c in E.fromstring(z.read(f'xl/comments{i}.xml')).findall('.//s:comment',NS):
                    comments[c.get('ref')]=''.join(t.text or '' for t in c.findall('.//s:t',NS))
            sheets[name]=(rows,comments)
        return sheets
cities=['moskva','sankt-peterburg','novosibirsk','ekaterinburg','kazan','nizhniy-novgorod','chelyabinsk','krasnoyarsk','samara','ufa','rostov-na-donu','krasnodar','omsk','voronezh','perm','volgograd']
operations=['plaster_wall','putty_third','wallpaper','primer_wall','paint_wall','tile_wall','screed_semi','screed','laminate','linoleum','parquet','tile_floor','waterproof','paint_ceiling','plaster_ceiling','plaster_slope']
result=[]
def add(code,title,unit,price,rough,labor,source,date,**meta):
    assert float(price)>0
    result.append(dict(code=code,title=title,unit=unit,price=str(price),rough=str(rough),labor=str(labor),source=source,date=date,**meta))
regional=book('Строительные_цены_по_городам_2026-10-28_1.xlsx')
for sheet,kind in [('Материалы','material'),('Работы','work')]:
    rows,comments=regional[sheet]
    for i,r in enumerate(rows[1:]):
        city=cities[i//16];op=operations[i%16];cell=f'A{i+2}'
        extra=comments.get(f'{"C" if kind=="material" else "B"}{i+2}','')
        source=comments.get(cell,'')+ ('\n'+extra if extra else '')
        add(f'city.{city}.{kind}.{op}',r['A'],'м²',r['C' if kind=='material' else 'B'],int(kind=='material' and op in ['plaster_wall','putty_third','primer_wall','screed_semi','screed','waterproof','plaster_ceiling','plaster_slope']),int(kind=='work'),source,'2026-10-27',city=city,operation=op,kind=kind)
# City rows remain provenance in the workbook; only the arithmetic averages are live rates.
from decimal import Decimal, ROUND_HALF_UP
regional_rows=result
result=[]
for kind in ['material','work']:
    for op in operations:
        group=[r for r in regional_rows if r['kind']==kind and r['operation']==op]
        price=(sum(Decimal(r['price']) for r in group)/Decimal(len(group))).quantize(Decimal('0.01'),rounding=ROUND_HALF_UP)
        title=group[0]['title'].split(' — ')[0]
        source='Среднее арифметическое по 16 городам из Строительные_цены_по_городам_2026-10-28_1.xlsx; нормативные ориентиры ФСНБ, не среднерыночная выборка. Средние середины исходных диапазонов.\n'+'; '.join(r['title'].split(' — ')[1]+': '+r['price'] for r in group)+'\n'+group[0]['source']
        add('average.'+kind+'.'+op,title,'м²',price,group[0]['rough'],group[0]['labor'],source,'2026-10-27',kind=kind,operation=op)
summary=book('Mobilny_prorab_svodny_spravochnik.xlsx')
for sheet,kind in [('Материалы','material'),('Работы','work')]:
    for r in summary[sheet][0][1:]:
        if kind=='material':
            source=' | '.join(filter(None,[r.get('W'),r.get('X'),r.get('Y'),r.get('U'),r.get('V'),r.get('Z'),r.get('AD'),r.get('AE')]))
            add('ref.'+r['A'],r['B'],r['M'],r['N'],0,0,source,'2026-10-27',kind=kind,pack=r['L'],needUnit=r['J'],norm=r['H'],waste=r['K'],status=r.get('W',''),coverage=r.get('P',''))
        else:
            source=' | '.join(filter(None,[r.get('L'),r.get('M'),r.get('N'),r.get('J'),r.get('K'),r.get('O'),r.get('S'),r.get('T')]))
            add('ref.'+r['A'],r['B'],r['G'],r['H'],0,1,source,'2026-10-27',kind=kind,status=r.get('L',''),coverage=r.get('I',''))
add('rule.stretch.minimum','Минимальная стоимость заказа натяжных потолков','заказ',12000,0,1,'Сводный справочник, лист Пояснения: минимум 12000 руб. на один заказ поставщика, один раз на проект. Доплата равна разнице до минимума. Условие модели, требует подтверждения поставщиком.','2026-10-27',kind='work')
assert len({r['code'] for r in result})==len(result)
Path('backend/src/main/resources/pricing/import-2026-10-28.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(result),'rows; max source',max(len(r['source']) for r in result))
