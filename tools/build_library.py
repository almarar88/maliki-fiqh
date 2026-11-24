#!/usr/bin/env python3
"""Builds data/library.json: verified links (shuruh/pdf/audio), long bios and Khalil's terminology —
all quoted programmatically from fetched pages (sources/)."""
import json,re,datetime
S='sources/'
def load(b): return json.load(open(S+f'pages_{b}.json'))
FOOT=re.compile(r'^\(?[٠-٩0-9]+\)?\s*[-–]|^\([٠-٩0-9]+\)|^=')
MARK=re.compile(r'\s?\([٠-٩0-9]+\)')
def clean(t): return re.sub(r'\s+',' ',MARK.sub('',t)).strip()
V=json.load(open(S+'lib/verified.json'))
lib={}
for tid,d in V.items():
    out={}
    for k in ['shuruh','pdf','audio']:
        L=[]
        for x in d[k]:
            if x['site']=='archive' and k=='audio' and not x.get('nmp3'): continue
            if x['site']=='archive' and k=='pdf' and not x.get('npdf'): continue
            e={'title':x['title'],'by':(x.get('creator') or '').strip('[ ') or None,'url':x['url'],'site':'المكتبة الشاملة' if x['site']=='shamela' else 'أرشيف الإنترنت (archive.org)'}
            if x.get('nmp3'): e['files']=x['nmp3']
            L.append(e)
        out[k]=L
    lib[tid]=out
def paras(b,pages,start_cut=None):
    P=load(b); out=[]
    for p in pages:
        pg=P[str(p)]
        for i,x in enumerate(pg['paras']):
            t=x['t'].strip()
            if not t or FOOT.match(t) or t in('* * *',): continue
            out.append({'t':clean(t).strip('[]'),'src':pg['url']})
    return out
bios={}
bios['khalil']={'title':'التعريف بالمؤلف: خليل بن إسحاق الجندي','from':'من «المقدمة التحقيقية» لكتاب تحبير المختصر لبهرام — المكتبة الشاملة (كتاب ١٤٧٣١٣)','paras':paras(147313,range(9,20))}
bios['risala']={'title':'التعريف بابن أبي زيد القيرواني','from':'من «مقدمة التحقيق» لرسالة ابن أبي زيد (نسخة التتائي) — المكتبة الشاملة (كتاب ١٤٣٠)','paras':paras(1430,range(17,24))}
bios['bashar']={'title':'ترجمة الشيخ محمد البشار','from':'من «مقدمة التحقيق» لأسهل المسالك — المكتبة الشاملة (كتاب ٦٣١)','paras':paras(631,[2])}
M=load(14249); t0=M['3']['paras'][0]['t']; k=t0.find('سيدي أبو محمد عبد الواحد')
bios['ashir']={'title':'ترجمة ابن عاشر بقلم تلميذه ميارة','from':'من مقدمة «الدر الثمين والمورد المعين» لميارة — المكتبة الشاملة (كتاب ١٤٢٤٩)',
  'paras':[{'t':'… '+clean(t0[k:]),'src':M['3']['url']}]+[{'t':clean(x['t']),'src':M['3']['url']} for x in M['3']['paras'][1:3]]}
for b in bios.values():
    b['paras']=[p for p in b['paras'] if len(p['t'])>3]
# Khalil terminology (verbatim fragments of his preface)
B=load(147313)
gl=[]
for pg,ix in [(68,2),(74,2)]:
    t=B[str(pg)]['paras'][ix]['t']
    for frag in re.split(r'،\s*',t):
        frag=frag.strip(' ,.،')
        if '"' in frag or '«' in frag: gl.append({'t':frag,'src':B[str(pg)]['url']})
        elif gl and gl[-1]['src']==B[str(pg)]['url']: gl[-1]['t']+='، '+frag
glossary={'title':'اصطلاح خليل في مختصره — بنصّه من مقدمته','note':'مقاطع منقولة حرفيًّا من مقدمة المختصر (كما في تحبير المختصر)، مقسّمة عند الفواصل فقط.','items':gl,
  'full':[{'t':B['68']['paras'][2]['t'],'src':B['68']['url']},{'t':B['74']['paras'][2]['t'],'src':B['74']['url']}]}
out={'version':3,'generated':datetime.datetime.now().isoformat(timespec='minutes'),'links':lib,'bios':bios,'glossary':glossary}
json.dump(out,open('data/library.json','w'),ensure_ascii=False,separators=(',',':'))
for t,d in lib.items(): print(t,{k:len(v) for k,v in d.items()})
for t,b in bios.items(): print(t,len(b['paras']),sum(len(p['t']) for p in b['paras']))
for g in gl: print(' -',g['t'][:110])
