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
 {'id':'akhdari','sym':'ي','name':'الأخضري','book':'مختصر الأخضري في العبادات على مذهب الإمام مالك','author':'أبو زيد عبد الرحمن بن محمد الصغير الأخضري (ت ٩٨٣هـ)','type':'نثر','color':'#2f6f5e',
  'edition':'متن الأخضري — مكتبة ومطبعة محمد علي صبيح، الأزهر؛ النسخة الإلكترونية في المكتبة الشاملة (كتاب ٩٥٤٨)','home':'https://shamela.ws/book/9548'},
 {'id':'ashir','sym':'ع','name':'ابن عاشر','book':'المرشد المعين على الضروري من علوم الدين','author':'عبد الواحد بن أحمد بن عاشر الأنصاري الفاسي (ت ١٠٤٠هـ)','type':'نظم (رجز)','color':'#8a5a14',
  'edition':'أبيات النظم منقولة من دروس «المرشد المعين» على موقع دروس محظرية (ma7dhara.com)، ومقابلة آليًا على النظم الوارد في «الدر الثمين والمورد المعين» لميارة — المكتبة الشاملة (كتاب ١٤٢٤٩)','home':'https://read.shamela.ws/book/14249',
  'note':'لم نجد نسخة رقمية مستقلة للمتن نفسه في الشاملة أو ويكي مصدر؛ لذلك كل بيت يحمل علامة: «مقابَل» إن وُجد مطابقًا في شرح ميارة، أو «مصدر واحد» إن لم تتم مطابقته آليًا. الأبواب هنا قد لا تحوي كل أبيات الباب.'},
 {'id':'bashar','sym':'ش','name':'البشار','book':'أسهل المسالك في مذهب الإمام مالك (نظم)','author':'محمد بن حسن بن علي بن سالم البشار الرشيدي (ت بعد ١١٦١هـ)','type':'نظم (رجز)','color':'#7a2e3b',
  'edition':'أسهل المسالك — ضمن مجموع «الرفعة في بعض متون فقه المذاهب الأربعة»، جمع وضبط د. توفيق ضمرة، دار عمار ١٤٤١هـ؛ المكتبة الشاملة (كتاب ٦٣١)','home':'https://shamela.ws/book/631',
  'note':'تحقّقنا من نسبة النظم: بطاقة الشاملة تنص على أن «أسهل المسالك في مذهب الإمام مالك» لمحمد البشار الرشيدي. الأقواس داخل الأبيات من وضع المحقق للتمييز.'},
 {'id':'khalil','sym':'خ','name':'خليل','book':'مختصر العلامة خليل','author':'خليل بن إسحاق الجندي المالكي (ت ٧٧٦هـ)','type':'نثر','color':'#2b4c7e',
  'edition':'نص المتن كما ورد مفصولًا بعنوان «(المتن)» في «تحبير المختصر» (الشرح الوسط لبهرام على مختصر خليل) — المكتبة الشاملة (كتاب ١٤٧٣١٣)','home':'https://shamela.ws/book/147313',
  'note':'حُذفت أرقام حواشي المحقق فقط. العناوين بين معقوفين من وضع المحقق.'},
 {'id':'risala','sym':'س','name':'الرسالة','book':'الرسالة الفقهية','author':'أبو محمد عبد الله بن أبي زيد القيرواني (ت ٣٨٦هـ)','type':'نثر','color':'#5b3f86',
  'edition':'رسالة ابن أبي زيد — نسخة التتائي، تحقيق إبراهيم السناري، معهد المخطوطات العربية ١٤٤٢هـ؛ المكتبة الشاملة (كتاب ١٤٣٠)','home':'https://shamela.ws/book/1430',
  'note':'حُذفت أرقام الحواشي وإشارات ألواح المخطوط (مثل: / خ ١٥٠ أ/). العناوين بين معقوفين من وضع المحقق.'},
]
chapters=[
 {'id':'tahara','title':'باب الطهارة','sub':'المياه، والطاهر والنجس، وإزالة النجاسة'},
 {'id':'wudu','title':'باب الوضوء','sub':'فرائضه وسننه وفضائله ونواقضه'},
 {'id':'ghusl','title':'باب الغسل','sub':'موجباته وفرائضه وسننه (باب إضافي)','extra':True},
 {'id':'tayammum','title':'باب التيمم','sub':'أسبابه وفرائضه وسننه ونواقضه'},
 {'id':'salat','title':'باب الصلاة','sub':'شروطها وفرائضها وسننها وفضائلها ومكروهاتها'},
 {'id':'jumua','title':'باب صلاة الجمعة','sub':'شروطها ووجوبها وسننها وآدابها'},
 {'id':'sahw','title':'باب السهو في الصلاة','sub':'سجود السهو وأحكامه'},
]
P={c['id']:{} for c in chapters}
def put(ch,tid,status,secs,note=None):
    srcs=[]
    for s in secs:
        for u in pages_of(s):
            if u not in srcs: srcs.append(u)
    P[ch][tid]={'status':status,'sections':secs,'sources':srcs,**({'note':note} if note else {})}

# ---------- الأخضري
A=load(9548)
for ch,a,b in [('tahara','4.1','4.3'),('wudu','5.0','6.2'),('ghusl','6.3','8.1'),('tayammum','8.2','9.2'),('salat','10.3','16.0'),('sahw','16.1','end')]:
    put(ch,'akhdari','verified',[prose_section('',span(A,a,b))])
P['jumua']['akhdari']={'status':'absent','sections':[],'sources':['https://read.shamela.ws/book/9548'],
  'note':'لم يُفرد الأخضري لصلاة الجمعة بابًا ولا فصلًا (فهرس الكتاب في الشاملة: الطهارة، التيمم، الحيض، النفاس، الأوقات، شروط الصلاة، السهو).'}

# ---------- الرسالة (نسخة التتائي)
R=load(1430)
def rsec(title,a,b): return prose_section(title,span(R,a,b))
put('tahara','risala','verified',[rsec('باب طهارة الماء والثوب والبقعة وما يجزئ من اللباس في الصلاة','89.2','92.1')])
put('wudu','risala','verified',[rsec('باب ما يجب منه الوضوء والغسل (أسباب الحدث)','86.0','87.2'),rsec('باب صفة الوضوء ومسنونه ومفروضه وذكر الاستنجاء والاستجمار','92.3','99.99')])
put('ghusl','risala','verified',[rsec('من باب ما يجب منه الوضوء والغسل (موجبات الغسل)','87.3','87.99'),rsec('باب في الغسل','100.1','102.0')])
put('tayammum','risala','verified',[rsec('باب في من لم يجد الماء وصفة التيمم','102.2','104.99')])
put('salat','risala','verified',[rsec('باب صفة العمل في الصلوات المفروضة وما يتصل بها من النوافل والسنن','111.2','124.99')])
put('jumua','risala','verified',[rsec('باب صلاة الجمعة','140.2','141.99')])
put('sahw','risala','verified',[rsec('من «باب جامع في الصلاة»: سجود السهو','127.3','130.1')],
    note='لم تُفرد الرسالة للسهو بابًا مستقلًا؛ أحكامه في «باب جامع في الصلاة»، وهذا هو الجزء الخاص بالسهو منه.')

# ---------- خليل (من تحبير المختصر)
segs=json.load(open(S+'bahram_segs.json'))
B=load(147313)
def ksec(title,a,b):
    items=[]
    for j in range(a,b+1):
        k,i,ty,t=segs[j]
        if ty!='M' or FOOT.match(t): continue
        items.append({'kind':'p','t':clean(t),'src':B[str(k)]['url']})
    return {'title':title,'items':items}
put('tahara','khalil','verified',[ksec('باب: أحكام المياه',2,10),ksec('فصل: الطاهر والنجس',12,22),ksec('فصل: إزالة النجاسة وما يعفى عنه',24,33)])
put('wudu','khalil','verified',[ksec('فصل: فرائض الوضوء وسننه وفضائله',36,44),ksec('فصل: نواقض الوضوء',53,56)])
put('ghusl','khalil','verified',[ksec('فصل: الغسل',58,60)])
put('tayammum','khalil','verified',[ksec('فصل: التيمم',67,76)])
put('salat','khalil','verified',[ksec('فصل: فرائض الصلاة',101,104),ksec('فصل: سنن الصلاة ومندوباتها',106,112),ksec('فصل: مكروهات الصلاة',114,116)])
put('jumua','khalil','verified',[ksec('فصل: الجمعة',179,191)])
put('sahw','khalil','verified',[ksec('فصل: سجود السهو',123,138)])

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
        elif t.startswith('بَابُ') or t.startswith('باب'):
            items.append({'kind':'h','t':t,'src':u})
        elif t and not FOOT.match(t): items.append({'kind':'p','t':clean(t),'src':u})
    return {'title':title,'items':items}
put('tahara','bashar','verified',[bsec('','7.2','9.10')])
put('wudu','bashar','verified',[bsec('','9.11','10.12')])
put('ghusl','bashar','verified',[bsec('','11.11','12.1')])
put('tayammum','bashar','verified',[bsec('','12.2','12.99')])
put('salat','bashar','verified',[bsec('','15.9','17.12')])
put('sahw','bashar','verified',[bsec('','18.4','19.3')])
put('jumua','bashar','verified',[bsec('','23.0','23.14')])

# ---------- ابن عاشر
V=json.load(open(S+'ashir_verses.json'))
HAR=re.compile('[\u064B-\u0652]')
def vocal(s):
    ws=s.split(); return ws and sum(bool(HAR.search(w)) for w in ws)/len(ws)>=0.6
keep=[]
for v in V:
    if v['a'].startswith('{') or v['b'].startswith('{'): continue
    if v['match']>=0.75 or (vocal(v['a']+' '+v['b']) and v['match']>=0.45):
        keep.append(v)
def norm(t):
    t=HAR.sub('',t).replace('ـ',''); return re.sub(r'\s+',' ',re.sub('[^\u0621-\u064A ]',' ',t)).strip()
starts=[('tahara','فصل وتحصل الطهارة'),('wudu','فصل فرائض الوضو'),('ghusl','فصل فروض الغسل'),('tayammum','فصل لخوف ضر'),('salat','فرائض الصلاة ست'),('other','فصل وخمس صلوات'),('sahw','فصل لنقص سنة'),('jumua','فصل بموطن القرى'),('end','شرط الامام')]
cur=None; buckets={}
for v in keep:
    n=norm(v['a']).replace('إ','ا').replace('أ','ا')
    for ch,s in starts:
        if n.startswith(norm(s).replace('إ','ا').replace('أ','ا')): cur=ch
    if cur and cur not in ('other','end'): buckets.setdefault(cur,[]).append(v)
for ch,vs in buckets.items():
    items=[]
    for v in vs:
        items.append({'kind':'v','a':re.sub(r'\s+',' ',v['a']).strip(' .'),'b':re.sub(r'\s+',' ',v['b']).strip(' .'),'src':v['url'],
                      'check':'2' if v['match']>=0.75 else '1','cross':B and f"https://read.shamela.ws/book/14249/{v['mpage']}" if v['match']>=0.75 else None})
    sec={'title':'','items':items}
    put(ch,'ashir','partial',[sec],note='الأبيات منقولة من مصدر رقمي ومقابلة آليًا على شرح ميارة؛ قد يكون الباب ناقص بعض الأبيات، فيُراجَع على نسخة مطبوعة.')
    # add cross pages to sources
    for it in items:
        if it.get('cross') and it['cross'] not in P[ch]['ashir']['sources']: P[ch]['ashir']['sources'].append(it['cross'])
for c in chapters:
    if 'ashir' not in P[c['id']]:
        P[c['id']]['ashir']={'status':'unverified','sections':[],'sources':[],'note':'لم يُتحقق من النص بعد'}
for c in chapters: c['passages']=P[c['id']]
out={'meta':{'title':'المقارِن الفقهي المالكي','generated':datetime.datetime.now().isoformat(timespec='minutes'),
  'order':['akhdari','ashir','bashar','khalil','risala']},'texts':texts,'chapters':chapters}
json.dump(out,open('data/fiqh.json','w'),ensure_ascii=False,indent=1)
# report
for c in chapters:
    row=[]
    for t in out['meta']['order']:
        p=c['passages'][t]; n=sum(len(s['items']) for s in p['sections'])
        row.append(f"{t}:{p['status']}({n})")
    print(c['id'],' | '.join(row))
