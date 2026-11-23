#!/usr/bin/env python3
"""Builds data/fiqh.json from raw pages fetched from Shamela (sources/pages_*.json)
and ma7dhara.com lessons (sources/ma7/posts.json). No text is typed by hand:
every passage is copied programmatically from the fetched source pages."""
import json,re,datetime
S='sources/'
def load(b): return json.load(open(S+f'pages_{b}.json'))
FOOT=re.compile(r'^\(?[٠-٩0-9]+\)?\s*[-–]|^\([٠-٩0-9]+\)|^=')
MARK=re.compile(r'\s?\([٠-٩0-9]+\)')
MS=re.compile(r'/\s*[خأبجسن]\s*[٠-٩0-9]+\s*[أب]?\s*/\s*')
KH_FOOTNUM=re.compile(r'(?<=[\u0621-\u0652])[٠-٩]+')
def clean(t):
    t=MS.sub('',t); t=MARK.sub('',t); return re.sub(r'\s+',' ',t).strip()
def pid(s):
    a,b=s.split('.'); return int(a),int(b)
def span(pages,a,b):
    """paragraphs from page.idx a to page.idx b inclusive ('end' allowed)"""
    (pa,ia)=pid(a); out=[]
    if b=='end': pb,ib=10**9,10**9
    else: pb,ib=pid(b)
    for k in sorted(pages,key=int):
        k_=int(k)
        if k_<pa or k_>pb: continue
        for i,p in enumerate(pages[k]['paras']):
            if (k_,i)<(pa,ia) or (k_,i)>(pb,ib): continue
            out.append((k_,i,p['t'].strip(),pages[k]['url']))
    return out
def prose_section(title,rows,editorial_heads=True):
    items=[]
    for k,i,t,u in rows:
        if not t or FOOT.match(t) or t=='...': continue
        if re.fullmatch(r'\[+.*\]+:?',t):
            items.append({'kind':'h','t':t.strip('[]: '),'src':u});continue
        items.append({'kind':'p','t':clean(t),'src':u})
    return {'title':title,'items':items}
def pages_of(sec): 
    seen=[]
    for it in sec['items']:
        if it['src'] not in seen: seen.append(it['src'])
    return seen

texts=[
 {'id':'akhdari','sym':'ي','name':'الأخضري','book':'مختصر الأخضري في العبادات على مذهب الإمام مالك','author':'أبو زيد عبد الرحمن بن محمد الصغير الأخضري','type':'نثر','color':'#2f6f5e',
  'edition':'متن الأخضري — مكتبة ومطبعة محمد علي صبيح، الأزهر؛ النسخة الإلكترونية في المكتبة الشاملة (كتاب ٩٥٤٨)','home':'https://shamela.ws/book/9548'},
 {'id':'ashir','sym':'ع','name':'ابن عاشر','book':'المرشد المعين على الضروري من علوم الدين','author':'عبد الواحد بن أحمد بن عاشر الأنصاري الفاسي','type':'نظم (رجز)','color':'#8a5a14',
  'edition':'نص المتن الكامل كما في موقع الطريقة التجانية (tariqa-tijaniyya.es)، مقابَلًا بيتًا بيتًا على أبيات النظم الواردة في «الدر الثمين والمورد المعين» لميارة (المكتبة الشاملة، كتاب ١٤٢٤٩)، وعلى دروس «المرشد المعين» في موقع دروس محظرية (ma7dhara.com)','home':'http://www.tariqa-tijaniyya.es/fiqh_Ibn_%27Ashir_00.html',
  'note':'لا توجد في الشاملة نسخة مستقلة للمتن؛ لذلك نقلنا المتن الكامل من مصدر رقمي واحد، ثم قابلنا كل شطر آليًا على شرح ميارة ودروس محظرية. كل بيت يحمل علامة: «مقابَل» (وُجد في مصدر ثانٍ على الأقل) أو «مصدر واحد». صُحّح رسم التنوين فقط (كتابة الحركتين المكررتين تنوينًا). وشطر واحد ساقط من نسخة الموقع أُكمل من شرح ميارة ونُبّه عليه.'},
 {'id':'bashar','sym':'ش','name':'البشار','book':'أسهل المسالك في مذهب الإمام مالك (نظم)','author':'محمد بن حسن بن علي بن سالم البشار الرشيدي','type':'نظم (رجز)','color':'#7a2e3b',
  'edition':'أسهل المسالك — ضمن مجموع «الرفعة في بعض متون فقه المذاهب الأربعة»، جمع وضبط د. توفيق ضمرة، دار عمار ١٤٤١هـ؛ المكتبة الشاملة (كتاب ٦٣١)','home':'https://shamela.ws/book/631',
  'note':'تحقّقنا من نسبة النظم: بطاقة الشاملة تنص على أن «أسهل المسالك في مذهب الإمام مالك» لمحمد البشار الرشيدي. الأقواس داخل الأبيات من وضع المحقق للتمييز.'},
 {'id':'khalil','sym':'خ','name':'خليل','book':'مختصر العلامة خليل','author':'خليل بن إسحاق الجندي المالكي','type':'نثر','color':'#2b4c7e',
  'edition':'نص المتن كما ورد مفصولًا بعنوان «(المتن)» في «تحبير المختصر» (الشرح الوسط لبهرام على مختصر خليل) — المكتبة الشاملة (كتاب ١٤٧٣١٣)','home':'https://shamela.ws/book/147313',
  'note':'حُذفت أرقام حواشي المحقق فقط. العناوين بين معقوفين من وضع المحقق.'},
 {'id':'risala','sym':'س','name':'الرسالة','book':'الرسالة الفقهية','author':'أبو محمد عبد الله بن أبي زيد القيرواني','type':'نثر','color':'#5b3f86',
  'edition':'رسالة ابن أبي زيد — نسخة التتائي، تحقيق إبراهيم السناري، معهد المخطوطات العربية ١٤٤٢هـ؛ المكتبة الشاملة (كتاب ١٤٣٠)','home':'https://shamela.ws/book/1430',
  'note':'حُذفت أرقام الحواشي وإشارات ألواح المخطوط (مثل: / خ ١٥٠ أ/). العناوين بين معقوفين من وضع المحقق.'},
]

BOOKS=[('tahara','كتاب الطهارة'),('salat','كتاب الصلاة'),('zakat','كتاب الزكاة'),('siyam','كتاب الصيام والاعتكاف'),('hajj','كتاب الحج')]
chapters=[
 ('miyah','tahara','باب المياه','أقسام المياه وما تحصل به الطهارة'),
 ('najasa','tahara','باب النجاسات وإزالتها','الأعيان الطاهرة والنجسة، وإزالة النجاسة وما يعفى عنه'),
 ('istinja','tahara','باب قضاء الحاجة والاستنجاء','آداب قضاء الحاجة والاستنجاء والاستجمار'),
 ('wudu','tahara','باب الوضوء','فرائضه وسننه وفضائله ومكروهاته'),
 ('nawaqid','tahara','باب نواقض الوضوء','الأحداث والأسباب وما يمنعه الحدث'),
 ('khuffain','tahara','باب المسح على الخفين والجبيرة','شروط المسح ومبطلاته'),
 ('ghusl','tahara','باب الغسل','موجباته وفرائضه وسننه وفضائله'),
 ('tayammum','tahara','باب التيمم','أسبابه وفرائضه وسننه ونواقضه'),
 ('hayd','tahara','باب الحيض والنفاس','أحكام الدماء وما تمنعه'),
 ('awqat','salat','باب أوقات الصلاة','الوقت المختار والضروري'),
 ('adhan','salat','باب الأذان والإقامة','حكمهما وصفتهما'),
 ('shurut','salat','باب شروط الصلاة','الطهارة وستر العورة واستقبال القبلة'),
 ('sifa','salat','باب صفة الصلاة','فرائضها وسننها وفضائلها ومكروهاتها ومبطلاتها'),
 ('qada','salat','باب قضاء الفوائت','وجوب القضاء والترتيب'),
 ('sahw','salat','باب السهو في الصلاة','سجود السهو وأحكامه'),
 ('nawafil','salat','باب النوافل والوتر وسجود التلاوة','الرغائب والسنن والنفل المطلق'),
 ('jamaa','salat','باب صلاة الجماعة والإمامة','شروط الإمام والمأموم'),
 ('qasr','salat','باب القصر والجمع','صلاة المسافر'),
 ('jumua','salat','باب صلاة الجمعة','شروطها ووجوبها وسننها وآدابها'),
 ('khawf','salat','باب صلاة الخوف','صفتها'),
 ('eid','salat','باب صلاة العيدين','صفتها والتكبير'),
 ('kusuf','salat','باب صلاة الكسوف والخسوف','صفتها'),
 ('istisqa','salat','باب صلاة الاستسقاء','صفتها'),
 ('janaiz','salat','باب الجنائز','المحتضر والغسل والكفن والصلاة والدفن'),
 ('zakat','zakat','باب الزكاة','زكاة العين والحرث والماشية ومصارفها'),
 ('fitr','zakat','باب زكاة الفطر','قدرها ووقتها ومن تجب عنه'),
 ('siyam','siyam','باب الصيام','فرائضه ومفسداته وكفارته'),
 ('itikaf','siyam','باب الاعتكاف','شروطه ومبطلاته'),
 ('hajj','hajj','باب الحج والعمرة','أركانه وواجباته وسننه ومحظورات الإحرام'),
]
chapters=[{'id':a,'book':b,'title':c,'sub':d} for a,b,c,d in chapters]
P={c['id']:{} for c in chapters}
def put(ch,tid,status,secs,note=None):
    srcs=[]
    for s in secs:
        for u in pages_of(s):
            if u not in srcs: srcs.append(u)
    secs=[s for s in secs if s['items']]
    P[ch][tid]={'status':status,'sections':secs,'sources':srcs,**({'note':note} if note else {})}
def absent(ch,tid,note,src):
    P[ch][tid]={'status':'absent','sections':[],'sources':[src],'note':note}

# ---------- الأخضري
A=load(9548)
for ch,a,b in [('miyah','4.1','4.2'),('najasa','4.3','4.99'),('wudu','5.0','6.0'),('nawaqid','6.1','6.2'),('ghusl','6.3','8.1'),('tayammum','8.2','9.2'),
               ('hayd','9.3','10.2'),('awqat','10.3','11.0'),('shurut','11.1','12.0'),('sifa','12.1','15.0'),('qada','15.1','16.0'),('sahw','16.1','end')]:
    put(ch,'akhdari','verified',[prose_section('',span(A,a,b))])
for c in chapters:
    if 'akhdari' not in P[c['id']]:
        absent(c['id'],'akhdari','لم يتناول مختصر الأخضري هذا الباب؛ فهو مقصور على الطهارة والصلاة إلى السهو (فهرس الكتاب في الشاملة: الطهارة، التيمم، الحيض، النفاس، الأوقات، شروط الصلاة، السهو).','https://read.shamela.ws/book/9548')

# ---------- الرسالة (نسخة التتائي)
R=load(1430)
def rsec(title,a,b): return prose_section(title,span(R,a,b))
RM=[('miyah',[('باب طهارة الماء والثوب والبقعة','89.1','91.0')]),
 ('najasa',[('طهارة البقعة والثوب','91.1','91.2'),('من «باب جامع في الصلاة»: من مسائل الطهارة','133.2','133.4')]),
 ('istinja',[('من باب صفة الوضوء: الاستنجاء والاستجمار','92.2','94.0')]),
 ('wudu',[('باب صفة الوضوء ومسنونه ومفروضه','94.1','99.99')]),
 ('nawaqid',[('باب ما يجب منه الوضوء والغسل','86.0','87.2')]),
 ('khuffain',[('','105.0','105.99')]),
 ('ghusl',[('من باب ما يجب منه الوضوء والغسل: موجبات الغسل','87.3','87.99'),('','100.0','102.0')]),
 ('tayammum',[('','102.1','104.99')]),
 ('hayd',[('من باب ما يجب منه الوضوء والغسل: الحيض والاستحاضة والنفاس','88.0','89.0')]),
 ('awqat',[('','106.0','109.2')]),('adhan',[('','109.3','111.0')]),
 ('shurut',[('أماكن النهي وصفة ثياب المصلي','91.3','92.1')]),
 ('sifa',[('','111.1','123.0'),('من «باب جامع في الصلاة»: صلاة المريض','134.1','134.3')]),
 ('qada',[('من «باب جامع في الصلاة»: ترتيب الفوائت والإعادة في الوقت','130.2','131.2')]),
 ('sahw',[('من «باب جامع في الصلاة»: سجود السهو','127.1','130.1')]),
 ('nawafil',[('الشفع والوتر وصلاة الليل وتحية المسجد','123.1','124.99'),('','136.2','138.2')]),
 ('jamaa',[('','125.0','127.0')]),
 ('qasr',[('','138.3','140.0'),('من «باب جامع في الصلاة»: الجمع بين الصلاتين','131.3','132.3')]),
 ('jumua',[('','140.1','141.99')]),('khawf',[('','142.0','142.99')]),('eid',[('','143.0','145.3')]),
 ('kusuf',[('','145.4','146.99')]),('istisqa',[('','147.0','148.0')]),('janaiz',[('','148.1','157.2')]),
 ('siyam',[('','157.3','162.2')]),('itikaf',[('','162.3','164.0')]),('zakat',[('','164.1','174.3')]),
 ('fitr',[('','174.4','176.0')]),('hajj',[('','176.1','184.99')])]
for ch,rs in RM:
    put(ch,'risala','verified',[rsec(t,a,b) for t,a,b in rs],
        note='لم تُفرد الرسالة للسهو بابًا مستقلًا؛ أحكامه في «باب جامع في الصلاة».' if ch=='sahw' else None)

# ---------- خليل (من تحبير المختصر)
segs=json.load(open(S+'khalil_segs2.json'))
B=load(147313)
def ksec(title,a,b):
    items=[]
    for j in range(a,b+1):
        k,i,ty,t=segs[j]
        if ty=='H':
            items.append({'kind':'h','t':t.strip('[] '),'src':B[str(k)]['url']});continue
        if FOOT.match(t): continue
        items.append({'kind':'p','t':KH_FOOTNUM.sub('',clean(t)),'src':B[str(k)]['url']})
    while items and items[-1]['kind']=='h': items.pop()
    return {'title':title,'items':items}
KM=[('miyah',2,10),('najasa',11,31),('wudu',32,41),('istinja',42,47),('nawaqid',48,51),('ghusl',52,54),('khuffain',55,58),
    ('tayammum',59,68),('hayd',71,73),('awqat',74,79),('adhan',80,82),('shurut',83,92),('sifa',93,110),('qada',111,113),
    ('sahw',114,129),('nawafil',130,141),('jamaa',142,159),('qasr',160,167),('jumua',168,182),('khawf',183,184),('eid',185,187),
    ('kusuf',188,188),('istisqa',189,189),('janaiz',190,204),('siyam',205,214),('itikaf',215,219),('zakat',220,258),('fitr',259,262),('hajj',263,321)]
for ch,a,b in KM:
    secs=[ksec('',a,b)]
    if ch=='khuffain': secs.append(ksec('فصل: المسح على الجبيرة',69,70))
    put(ch,'khalil','verified',secs)

# ---------- البشار
H=load(631)
VS=re.compile(r'^([٠-٩]+)\s*-\s*(.*)$')
def bsec(title,a,b):
    items=[]
    for k,i,t,u in span(H,a,b):
        m=VS.match(t)
        if m:
            halves=[x.strip() for x in m.group(2).split('...') if x.strip()]
            items.append({'kind':'v','n':m.group(1),'a':halves[0],'b':halves[1] if len(halves)>1 else '','src':u})
        elif t.startswith('بَابُ') or t.startswith('باب') or t.startswith('فَصْلٌ'):
            items.append({'kind':'h','t':t,'src':u})
        elif t and not FOOT.match(t): items.append({'kind':'p','t':clean(t),'src':u})
    return {'title':title,'items':items}
HM=[('miyah','7.2','7.9'),('najasa','7.10','9.10'),('wudu','9.11','10.5'),('nawaqid','10.6','10.12'),('istinja','10.13','11.10'),
    ('ghusl','11.11','12.1'),('tayammum','12.2','12.99'),('khuffain','13.0','13.10'),('hayd','13.11','14.8'),('awqat','14.9','15.1'),
    ('adhan','15.2','15.8'),('shurut','15.9','15.13'),('sifa','15.14','17.12'),('qada','17.13','18.3'),('sahw','18.4','19.3'),
    ('nawafil','19.4','20.7'),('eid','20.8','20.17'),('kusuf','21.0','21.7'),('istisqa','21.8','21.11'),('jamaa','21.12','22.99'),
    ('jumua','23.0','23.14'),('qasr','23.15','24.13'),('janaiz','24.14','26.11'),('zakat','26.12','28.12'),('fitr','28.13','28.15'),
    ('siyam','28.16','31.1'),('itikaf','31.2','31.7'),('hajj','31.8','33.15')]
for ch,a,b in HM: put(ch,'bashar','verified',[bsec('',a,b)])
for c in chapters:
    if 'bashar' not in P[c['id']]:
        absent(c['id'],'bashar','لم نجد للبشار بابًا مستقلًا بهذا العنوان في «أسهل المسالك» (فهرس الكتاب في الشاملة)؛ قد تَرِد بعض مسائله ضمن أبواب أخرى.','https://shamela.ws/book/631')

# ---------- ابن عاشر
TV=json.load(open(S+'ashir_full.json'))
TIJ='http://www.tariqa-tijaniyya.es/fiqh_Ibn_%27Ashir_00.html'
def avs(lines):
    out=[]
    for v in TV:
        if any(a<=v['line']+1<=b for a,b in lines): out.append(v)
    return out
AM={'miyah':[(127,131)],'wudu':[(133,162)],'nawaqid':[(165,171)],'istinja':[(173,175)],'ghusl':[(178,200)],'hayd':[(196,199)],
    'tayammum':[(203,223)],'sifa':[(226,236),(253,269),(278,308)],'shurut':[(238,250)],'adhan':[(271,272)],'qasr':[(273,275)],
    'janaiz':[(310,315)],'nawafil':[(314,321)],'qada':[(316,317)],'eid':[(314,315)],'kusuf':[(314,315)],'istisqa':[(314,315)],
    'sahw':[(323,348)],'jumua':[(350,361)],'jamaa':[(363,396)],'zakat':[(398,451)],'fitr':[(453,456)],'siyam':[(458,493)],'hajj':[(495,700)]}
NOTE_BRIEF={'eid':'ذكر الناظم صلاة العيد إجمالًا ضمن السنن فقط، ولم يفصّل صفتها.','kusuf':'ذكر الناظم الكسوف إجمالًا ضمن السنن فقط.','istisqa':'ذكر الناظم الاستسقاء إجمالًا ضمن السنن فقط.','hayd':'لم يُفرد الناظم للحيض بابًا؛ هذه أبياته ضمن موجبات الغسل.','qada':'بيت قضاء الفرض ضمن أبيات السنن.','janaiz':'لم يُفرد الناظم للجنائز بابًا؛ ذكر فروض صلاة الجنازة في فصل «وخمس صلوات فرض عين».'}
for ch,rng in AM.items():
    vs=avs(rng); items=[]
    for v in vs:
        it={'kind':'v','a':v['ta'],'b':v['tb'],'src':TIJ,'check':v['check']}
        if v.get('cross'): it['cross']=v['cross']
        if v.get('cross2'): it['cross2']=v['cross2']
        if v.get('patch'): it['patch']=v['patch']
        if v.get('n'): it['n']=v['n']
        items.append(it)
    sec={'title':'','items':items}
    srcs=[TIJ]+sorted({x for v in vs for x in [v.get('cross'),v.get('cross2')] if x})
    allm=all(v['check']=='2' for v in vs)
    P[ch]['ashir']={'status':'verified' if allm else 'partial','sections':[sec],'sources':srcs,
        'note':(NOTE_BRIEF.get(ch,'')+(' ' if ch in NOTE_BRIEF else '')+('' if allm else 'بعض الأبيات من مصدر واحد ولم تُطابَق آليًا على مصدر ثانٍ — عليها علامة «مصدر واحد».')).strip() or None}
    if not P[ch]['ashir']['note']: del P[ch]['ashir']['note']
for c in chapters:
    if 'ashir' not in P[c['id']]:
        absent(c['id'],'ashir','لم يُفرد ابن عاشر لهذا الباب أبياتًا في «المرشد المعين» (راجعنا المتن كاملًا).',TIJ)
for c in chapters: c['passages']=P[c['id']]
out={'meta':{'title':'المقارِن الفقهي المالكي','version':2,'generated':datetime.datetime.now().isoformat(timespec='minutes'),
  'order':['akhdari','ashir','bashar','khalil','risala'],'books':[{'id':a,'title':b} for a,b in BOOKS]},'texts':texts,'chapters':chapters}
_B=json.load(open('sources/wiki_bios.json'))
for _t in texts:
  _b=_B.get(_t['id'])
  if _b: _t['bio']={'text':_b['extract'],'url':_b['url'],'perma':_b['perma'],'title':_b['title']}
json.dump(out,open('data/fiqh.json','w'),ensure_ascii=False,separators=(',',':'))
tot={}
for c in chapters:
    row=[]
    for t in out['meta']['order']:
        p=c['passages'][t]; n=sum(len(s['items']) for s in p['sections'])
        row.append(f"{t[:3]}:{p['status'][:4]}({n})")
    print(c['id'].ljust(9),' | '.join(row))
