# ---- v3: fill new chapters for all five texts (exec'd from build_data.py)
def item_p(t,u): return {'kind':'p','t':clean(t),'src':u}
def item_h(t,u): return {'kind':'h','t':clean(t).strip('[]: ').strip(),'src':u}
def put_secs(ch,tid,secs,note=None): put(ch,tid,'verified',secs,note=note)
def short(t): 
    t=clean(t).strip('[]: '); t=re.sub(r'\s*\(\s*[٠-٩0-9]+\s*\)','',t)
    return t if len(t)<=90 else t[:88]+'…'
# ===== الأخضري
put_secs('muqaddima','akhdari',[prose_section('',span(A,'2.1','2.2'))])
put_secs('tasawwuf','akhdari',[prose_section('أول ما يجب على المكلف',span(A,'2.3','4.0'))],
   note='هذا الفصل في افتتاح المختصر قبل «فصل في الطهارة»: في تصحيح الإيمان والتوبة وحفظ الجوارح، فوضعناه هنا لقربه من مبادئ السلوك.')
# ===== الرسالة
put_secs('muqaddima','risala',[prose_section('مقدمة الرسالة',span(R,'75.0','77.99'))])
put_secs('aqida','risala',[prose_section('باب ما تنطق به الألسنة وتعتقده الأفئدة من واجب أمور الديانات',span(R,'78.0','85.99'))])
RTOP={185:('udhiya',{'udhiya','dhakat','adab'}),193:('jihad',set()),197:('ayman',set()),202:('nikah',{'nikah','talaq','ila','rada','idda','nafaqa'}),
      216:('idda',{'idda','nafaqa'}),221:('buyu',{'buyu','salam','ijara','shirka','qirad'}),240:('wasaya',{'wasaya','itq'}),
      244:('shufa',{'shufa','waqf','rahn','amanat'}),251:('dima',{'dima','hudud'}),268:('qadaa',{'qadaa','shirka','sulh','amanat','rahn','shufa','wasaya'}),
      278:('faraid',set()),290:('jami',set()),305:('adab',set()),309:('adab',set()),311:('adab',set()),321:('adab',set()),324:('adab',set())}
rows=[];cur=None;allowed=set();title=''
for k,i,t,u in span(R,'185.0','330.99'):
    if not t or FOOT.match(t) or t=='...': continue
    if N(t).startswith('باب') and k in RTOP:
        cur,allowed=RTOP[k]; curdef=cur; title=short(t); rows.append((cur,title,item_h(t,u))); continue
    if re.fullmatch(r'\[+.*\]+:?',t):
        c=classify(t); cur=c if c in allowed else curdef
        rows.append((cur,title,item_h(t,u))); continue
    rows.append((cur,title,item_p(t,u)))
for ch,secs in group_sections(rows).items(): put_secs(ch,'risala',secs)
# ===== خليل (تحبير المختصر — المتن)
SA=json.load(open(S+'khalil_segs_all.json'))
rows=[];cur=None;title='';prevcr=None;pending=False
for k,i,ty,t in SA:
    u=B[str(k)]['url']
    if k<84:
        if ty=='M' and not FOOT.match(t): rows.append(('muqaddima','',{'kind':'p','t':KH_FOOTNUM.sub('',clean(t)),'src':u}))
        continue
    if k<976 or k>3317: continue
    cr=B[str(k)]['crumbs'][1]
    if cr!=prevcr:
        prevcr=cr; newch=classify(cr); newtitle=short(cr); pending=True
        if cur is None: cur,title,pending=newch,newtitle,False
    if pending and ty=='M' and N(t).startswith('باب'):
        cur,title,pending=newch,newtitle,False
    if ty=='H':
        if pending: cur,title,pending=newch,newtitle,False
        rows.append((cur,title,item_h(t,u))); continue
    if FOOT.match(t): continue
    rows.append((cur,title,{'kind':'p','t':KH_FOOTNUM.sub('',clean(t)),'src':u}))
for ch,secs in group_sections(rows).items():
    put_secs(ch,'khalil',secs,note=('في هذه المقدمة اصطلاح خليل في مختصره (فيها، أُوِّل، الاختيار، الترجيح، الظهور، القول، خلاف، التردد، لو…) بنصّه.' if ch=='muqaddima' else None))
# ===== البشار
put_secs('muqaddima','bashar',[bsec('','3.1','4.1')])
put_secs('aqida','bashar',[bsec('','4.2','7.1')])
rows=[];cur=None;title=''
for k,i,t,u in span(H,'33.16','72.99'):
    m=VS.match(t)
    if not m and (not t or FOOT.match(t)): continue
    if m:
        halves=[x.strip() for x in m.group(2).split('...') if x.strip()]
        rows.append((cur,title,{'kind':'v','n':m.group(1),'a':halves[0],'b':halves[1] if len(halves)>1 else '','src':u})); continue
    if N(t).startswith('باب'):
        cur=classify(t) or cur; title=short(t)
    if cur is None: continue
    rows.append((cur,title,{'kind':'h','t':t,'src':u}))
for ch,secs in group_sections(rows).items(): put_secs(ch,'bashar',secs)
# ===== ابن عاشر (أبيات المقدمة والعقيدة والأصول والتصوف)
TV2=json.load(open(S+'ashir_full2.json'))
def avs2(a,b): return [v for v in TV2 if a<=v['line']+1<=b]
for ch,(a,b) in {'muqaddima':(13,22),'aqida':(23,111),'usul':(112,125),'tasawwuf':(617,661)}.items():
    vs=avs2(a,b); items=[]; last=None
    if ch=='tasawwuf': items.append({'kind':'h','t':'كِتَابُ مُبَادِئِ التَّصَوُّفِ وَهَوَادِي التَّعَرُّفِ','src':TIJ})
    for v in vs:
        if v.get('head') and v['head']!=last and ch=='aqida':
            items.append({'kind':'h','t':v['head'],'src':TIJ}); last=v['head']
        it={'kind':'v','a':v['ta'],'b':v['tb'],'src':TIJ,'check':v['check'],'n':v['n']}
        if v.get('cross'): it['cross']=v['cross']
        if v.get('cross2'): it['cross2']=v['cross2']
        if v.get('alt') and v['alt']['r']>=90: it['alt']={'t':v['alt']['t'],'src':v['alt']['src']}
        items.append(it)
    srcs=[TIJ]+sorted({x for v in vs for x in [v.get('cross'),v.get('cross2')] if x})
    allm=all(v['check']=='2' for v in vs)
    P[ch]['ashir']={'status':'verified' if allm else 'partial','sections':[{'title':'','items':items}],'sources':srcs}
    if not allm: P[ch]['ashir']['note']='بعض الأبيات من مصدر واحد ولم تُطابَق آليًا على مصدر ثانٍ — عليها علامة «مصدر واحد». '+('عنوان الكتاب في نسخة شرح ميارة: «كتاب مباديء التصوف وهوادي التعرف».' if ch=='tasawwuf' else '')
    P[ch]['ashir']['note']=P[ch]['ashir'].get('note','').strip() or None
    if not P[ch]['ashir']['note']: del P[ch]['ashir']['note']
# ===== الغياب في الأبواب الجديدة
ABS={'akhdari':('مختصر الأخضري مقصور على ما يجب على المكلف والطهارة والصلاة إلى السهو؛ فلم يتناول هذا الباب.','https://shamela.ws/book/9548'),
 'ashir':('لم يتناول «المرشد المعين» هذا الباب؛ فهو في العقيدة والعبادات ومبادئ التصوف فقط (راجعنا المتن كاملًا).',TIJ),
 'bashar':('لم نجد للبشار بابًا بهذا العنوان في «أسهل المسالك» (راجعنا عناوين أبواب النظم كلها في الشاملة).','https://shamela.ws/book/631'),
 'khalil':('ليس في مختصر خليل بابٌ لهذا؛ فهو مختصر في الفروع يبدأ بالطهارة وينتهي بالفرائض.','https://shamela.ws/book/147313'),
 'risala':('لم تُفرد الرسالة لهذا بابًا مستقلًا.','https://shamela.ws/book/1430')}
ABS_SPECIAL={('risala','tasawwuf'):'لم تُفرد الرسالة لمبادئ التصوف بابًا؛ وفي «باب جمل من الفرائض والسنن» (قسم الجامع هنا) فقرات في «ما يجب على الجوارح» و«الإخلاص والتوبة».',
 ('risala','usul'):'لم تُفرد الرسالة لأصول الفقه بابًا؛ وفي آخرها فقرة «أدلة الفقه» (قسم الآداب هنا).'}
for c in chapters:
    if c['id'] not in NEW: continue
    for tid,(note,src) in ABS.items():
        if tid not in P[c['id']]:
            absent(c['id'],tid,ABS_SPECIAL.get((tid,c['id']),note),src)
# ===== روابط «شرح الباب» (الصفحات من فهارس الشروح في الشاملة)
TOC=json.load(open(S+'lib/toc_shuruh.json'))
SHB={'7441':'الثمر الداني شرح رسالة ابن أبي زيد القيرواني','21589':'الفواكه الدواني على رسالة ابن أبي زيد القيرواني','91':'شرح الخرشي على مختصر خليل'}
RK={'miyah':['طهاره الماء'],'najasa':['طهاره الماء'],'istinja':['صفه الوضوء'],'wudu':['صفه الوضوء'],'nawaqid':['ما يجب منه الوضوء'],'khuffain':['المسح علي الخفين'],
 'ghusl':['في الغسل'],'tayammum':['التيمم'],'hayd':['ما يجب منه الوضوء'],'awqat':['اوقات الصلاه'],'adhan':['الاذان'],'shurut':['طهاره الماء'],'sifa':['صفه العمل'],
 'qada':['جامع في الصلاه'],'sahw':['جامع في الصلاه'],'nawafil':['صفه العمل'],'jamaa':['الامامه'],'qasr':['صلاه السفر'],'jumua':['الجمعه'],'khawf':['الخوف'],
 'eid':['العيدين'],'kusuf':['الخسوف'],'istisqa':['الاستسقاء'],'janaiz':['المحتضر'],'zakat':['زكاه العين'],'fitr':['زكاه الفطر'],'siyam':['في الصيام'],'itikaf':['الاعتكاف'],
 'hajj':['الحج والعمره'],'aqida':['ما تنطق به'],'dhakat':['الضحايا'],'udhiya':['الضحايا'],'ayman':['الايمان والنذور'],'jihad':['الجهاد'],
 'nikah':['النكاح والطلاق'],'talaq':['النكاح والطلاق'],'ila':['النكاح والطلاق'],'rada':['النكاح والطلاق'],'idda':['العده والنفقه'],'nafaqa':['العده والنفقه'],
 'buyu':['البيوع'],'salam':['البيوع'],'ijara':['باب الاجاره','البيوع'],'shirka':['باب الشركه','البيوع'],'qirad':['باب القراض','البيوع'],
 'wasaya':['الوصايا'],'itq':['التدبير','الوصايا'],'shufa':['الشفعه'],'waqf':['الحبس','الشفعه'],'rahn':['باب الرهن','الشفعه'],'amanat':['باب العاريه','الشفعه'],
 'dima':['الدماء'],'hudud':['كتاب الحدود','الدماء'],'qadaa':['الاقضيه'],'sulh':['حكم الصلح','الاقضيه'],'faraid':['باب في الفرايض'],'jami':['جمل من الفرايض'],
 'adab':['الفطره']}
KK={'muqaddima':['مقدمه'],'aqida':[],'zakat':['الزكاه'],'fitr':['الزكاه'],'siyam':['الصوم'],'itikaf':['الاعتكاف'],'hajj':['الحج'],'dhakat':['الذكاه'],'udhiya':['الاضحيه'],
 'ayman':['اليمين'],'jihad':['الجهاد'],'nikah':['باب النكاح'],'talaq':['باب الطلاق','الخلع'],'ila':['الايلاء'],'idda':['العده'],'rada':['الرضاع'],'nafaqa':['النفقه'],
 'buyu':['باب البيع'],'salam':['باب السلم'],'rahn':['الرهن'],'sulh':['الصلح'],'shirka':['الشركه'],'amanat':['الوديعه'],'shufa':['الشفعه'],'qirad':['القراض'],
 'ijara':['الاجاره'],'waqf':['الوقف'],'qadaa':['القضاء'],'dima':['الدماء'],'hudud':['الرده'],'itq':['العتق'],'wasaya':['الوصايا'],'faraid':['الفرايض']}
for c in chapters:
    if c['book']=='tahara': KK.setdefault(c['id'],['الطهاره'])
    if c['book']=='salat': KK.setdefault(c['id'],['الوقت المختار'])
def toc_find(bid,kws):
    for kw in kws:
        for title,pg in TOC[bid]:
            if kw in N(title): return title,pg
    return None
for c in chapters:
    for tid,bids,KW in [('risala',['7441','21589'],RK),('khalil',['91'],KK)]:
        p=P[c['id']].get(tid)
        if not p or p['status']=='absent': continue
        L=[]
        for bid in bids:
            r=toc_find(bid,KW.get(c['id'],[]))
            if r: L.append({'book':SHB[bid],'title':r[0].strip('[]'),'url':f'https://read.shamela.ws/book/{bid}/{r[1]}'})
        if L: p['sharh']=L
    p=P[c['id']].get('ashir')
    if p and p['status']!='absent':
        cr=[it['cross'] for s in p['sections'] for it in s['items'] if it.get('cross') and 'book/14249' in it['cross']]
        if cr: p['sharh']=[{'book':'الدر الثمين والمورد المعين (شرح ميارة)','title':'موضع أول أبيات الباب في الشرح','url':cr[0]}]
