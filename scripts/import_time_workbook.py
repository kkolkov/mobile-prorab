"""Extract exact person-hours (not rounded display days) from the supplied workbook."""
import json,re,zipfile,xml.etree.ElementTree as E
from decimal import Decimal
from pathlib import Path
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ops=['plaster_wall','putty_third','wallpaper','primer_wall','paint_wall','tile_wall','screed_semi','screed','laminate','linoleum','parquet','tile_floor','waterproof','paint_ceiling','plaster_ceiling','plaster_slope']
with zipfile.ZipFile('Сроки.xlsx') as z:
    strings=[]
    if 'xl/sharedStrings.xml' in z.namelist():strings=[''.join(t.text or '' for t in x.findall('.//s:t',ns)) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
    rows=[]
    for r in E.fromstring(z.read('xl/worksheets/sheet2.xml')).findall('.//s:sheetData/s:row',ns)[1:]:
        row={}
        for c in r:
            v=c.find('s:v',ns);value=v.text if v is not None else ''.join(t.text or '' for t in c.findall('.//s:t',ns))
            if c.get('t')=='s':value=strings[int(value)]
            row[re.sub('[0-9]','',c.get('r'))]=value
        rows.append(row)
    comment=''
    for c in E.fromstring(z.read('xl/comments2.xml')).findall('.//s:comment',ns):
        if c.get('ref')=='C2':comment=''.join(t.text or '' for t in c.findall('.//s:t',ns))
    result=[]
    assert len(rows)==256
    for i,op in enumerate(ops):
        group=rows[i::16]
        assert len({r['D'] for r in group})==1 and len({r['C'] for r in group})==1
        raw=group[0]['D'];hours=re.search(r'—\s*([\d,]+)\s*чел',raw).group(1).replace(',','.')
        assert abs(Decimal(hours)/16-Decimal(group[0]['C']))<=Decimal('0.05')
        result.append(dict(code=op,title=group[0]['A'].split(' — ')[0],hours=hours,source='Сроки.xlsx, лист Работы. '+raw+'. '+comment,date='2026-10-28'))
Path('backend/src/main/resources/pricing/time-norms-2026-10-28.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Time norms:',len(result))
