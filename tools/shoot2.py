import asyncio,sys,json
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
OUT=sys.argv[2] if len(sys.argv)>2 else 'shots2'
CASES=[
 ('v3-desktop-home',1440,900,'#home',{},None),
 ('v3-desktop-library',1440,900,'#library',{},None),
 ('v3-desktop-study',1440,900,'#study',{},None),
 ('v3-desktop-read-nikah',1440,900,'#read/nikah',{'layout':'side'},None),
 ('v3-mobile-home',412,900,'#home',{},None),
 ('v3-mobile-read-buyu',412,900,'#read/buyu',{'layout':'stack'},'ibar'),
 ('v3-mobile-aqida',412,900,'#read/aqida',{'layout':'stack'},None),
 ('v3-mobile-tasawwuf',412,900,'#read/tasawwuf',{'layout':'stack'},None),
 ('v3-mobile-library',412,900,'#library',{},None),
 ('v3-mobile-study',412,900,'#study',{},None),
 ('v3-mobile-more',412,900,'#home',{},'more'),
 ('v3-mobile-palette',412,900,'#home',{},'pal'),
 ('v3-mobile-ai-ch',412,900,'#read/faraid',{},'askch'),
 ('v3-fold-home',344,882,'#home',{},None),
 ('v3-fold-read-faraid',344,882,'#read/faraid',{'layout':'stack'},None),
 ('v3-fold-study',344,882,'#study',{},None),
 ('v3-fold-library',344,882,'#library',{},None),
 ('v3-open-read-talaq',720,860,'#read/talaq',{},None),
 ('v3-open-map',720,860,'#map',{},None),
 ('v3-open-library',720,860,'#library',{},None),
 ('desktop-home',1440,900,'#home',{},None),
 ('desktop-map',1440,900,'#map',{},None),
 ('desktop-read-side',1440,900,'#read/wudu',{'layout':'side'},None),
 ('desktop-compare',1440,900,'#read/sahw',{'layout':'side','cmp':True},None),
 ('desktop-parchment',1440,900,'#read/zakat',{'theme':'parchment','layout':'side'},None),
 ('desktop-review',1440,900,'#review',{},None),
 ('desktop-coverage',1440,900,'#coverage',{},None),
 ('desktop-about',1440,900,'#about',{},None),
 ('mobile-home',412,900,'#home',{},None),
 ('mobile-read',412,900,'#read/hajj',{'layout':'stack'},None),
 ('mobile-memorize',412,900,'#read/wudu',{'layout':'stack','mem':'half','on':['ashir','bashar']},None),
 ('mobile-review',412,900,'#review',{},'answer'),
 ('mobile-ai',412,900,'#ai',{},None),
 ('mobile-message',412,900,'#message',{},None),
 ('mobile-search',412,900,'#read/miyah',{},'search'),
 ('fold-folded-home',344,882,'#home',{},None),
 ('fold-folded-read',344,882,'#read/jumua',{'layout':'stack'},None),
 ('fold-open-read',720,860,'#read/tayammum',{},None),
 ('fold-open-map',720,860,'#map',{},None),
 ('mobile-sepia-reduced',412,900,'#read/siyam',{'theme':'sepia','motion':'off','layout':'stack'},None),
]
only=sys.argv[3].split(',') if len(sys.argv)>3 else None
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    for name,w,h,hs,st,extra in CASES:
      if only and name not in only: continue
      ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if w<800 else 1,is_mobile=w<800,has_touch=w<800,color_scheme='dark')
      pg=await ctx.new_page()
      pg.on('console',lambda m,n=name: errs.append(f'{n}: {m.type}: {m.text}') if m.type in('error',) else None)
      pg.on('pageerror',lambda e,n=name: errs.append(f'{n}: PAGEERROR {e}'))
      await ctx.add_init_script("localStorage.setItem('mfq.settings',"+json.dumps(json.dumps(st))+")")
      await pg.goto(BASE+hs); await pg.wait_for_timeout(2600)
      if extra=='search':
        await pg.click('#btnSearch'); await pg.fill('#q','الدلك'); await pg.wait_for_timeout(800)
      if extra=='ibar':
        await pg.click('#card-risala .txt p[data-ik]'); await pg.wait_for_timeout(500)
      if extra=='more':
        await pg.click('#tabbar [data-more]'); await pg.wait_for_timeout(500)
      if extra=='pal':
        await (pg.click('#btnPal') if await pg.is_visible('#btnPal') else pg.evaluate("document.querySelector('[data-ma=pal]').click()")); await pg.fill('#palQ','شفعة'); await pg.wait_for_timeout(500)
      if extra=='askch':
        await pg.click('[data-act=askch]'); await pg.wait_for_timeout(1200)
      if extra=='answer':
        await pg.click('.opt'); await pg.wait_for_timeout(700)
      # check horizontal overflow
      ov=await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
      if ov>2: errs.append(f'{name}: HORIZONTAL OVERFLOW {ov}px')
      await pg.screenshot(path=f'{OUT}/{name}.png')
      await ctx.close()
    await b.close(); print('\n'.join(errs) or 'NO_ERRORS')
asyncio.run(main())
