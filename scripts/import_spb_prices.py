"""Import the supplied SPb supplement without altering earlier migration resources."""
import json, zipfile, re, unicodedata
import xml.etree.ElementTree as E
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
path=next(p for p in Path('.').glob('*.xlsx') if unicodedata.normalize('NFC',p.name)=='Прайсы_остекление_утепление_кухня_СПб.xlsx')
with zipfile.ZipFile(path) as z:
    shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        shared=[''.join(t.text or '' for t in r.findall('.//s:t',NS)) for r in E.fromstring(z.read('xl/sharedStrings.xml'))]
    sheets=[]
    for index in range(1,4):
        rows=[]
        for r in E.fromstring(z.read(f'xl/worksheets/sheet{index}.xml')).findall('.//s:sheetData/s:row',NS):
            cells={}
            for c in r:
                v=c.find('s:v',NS);value=v.text if v is not None else ''.join(t.text or '' for t in c.findall('.//s:t',NS))
                if c.get('t')=='s':value=shared[int(value)]
                cells[re.sub(r'\d','',c.get('r'))]=value or ''
            rows.append(cells)
        sheets.append(rows)
rows=[]
def add(code,title,unit,price,source,date,service=True):
    rows.append(dict(code='spb.'+code,title=title,unit=unit,price=str(Decimal(price).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)),rough='0',labor='1' if service else '0',source=source,date=date))
for r,kind in zip(sheets[0][3:5],['cold','warm']):
    area=Decimal(r['C'])*Decimal(r['D'])/Decimal(1000000)
    assert area==Decimal(r['E'])
    add('glazing.'+kind,r['A']+' с монтажом — типовой заказ СПб','м²',Decimal(r['B'])/area,
        f"СПб, типовой заказ {r['B']} ₽, {r['C']} × {r['D']} мм, {area} м². {r['G']}. {r['H']} Дата проверки, не дата прайса. Ставка пересчитана на м²; скидки и типоразмеры несопоставимы между вариантами. Разбивка материалов/монтажа не опубликована; комплекс учтён в услугах. {r['J']}",r['I'][:10])
for r,code in zip(sheets[1][3:6],['insulation.wall30','insulation.wall50','insulation.floor50']):
    add(code,r['A']+': '+r['C']+' с работой'+(' — от' if 'wall' in code else ''),'м²',r['B'],
        f"СПб. {r['C']}. {r['D']} {r['E']} Дата проверки, не дата прайса. Материалы и работа не разделены; комплекс учтён в услугах. Для пола толщина 50 мм подтверждена строкой сметы на странице; противоречащее примечание Excel не использовано. {r['G']}",r['F'][:10])
for r,code in zip(sheets[2][3:8],['kitchen.plastic','kitchen.enamel','kitchen.assembly','stone.installed','stone.labor']):
    kit=code in ['kitchen.plastic','kitchen.enamel']
    price=Decimal(r['B'])/3 if kit else Decimal(r['B'])
    add(code,r['A']+(' — от' if not kit else ''),'пог. м',price,
        f"СПб. {r['C']}; предложение {r['B']} ₽. {r['E']} "+('Цена комплекта / 3 м; мойка и смеситель включены. Постформинг не выделен по цене: нельзя вычитать неизвестную стоимость для замены камнем. ' if kit else 'Стартовая ставка «от», не фиксированная цена заказа. ')+r['G'],r['F'][:10],not kit)
assert len(rows)==10 and len({r['code'] for r in rows})==10
Path('backend/src/main/resources/pricing/spb-2026-10-28.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(rows),'SPb rows')
