import asyncio,sys,json
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
OUT=sys.argv[2] if len(sys.argv)>2 else 'shots2'
CASES=[
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
      if extra=='answer':
        await pg.click('.opt'); await pg.wait_for_timeout(700)
      # check horizontal overflow
      ov=await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
      if ov>2: errs.append(f'{name}: HORIZONTAL OVERFLOW {ov}px')
      await pg.screenshot(path=f'{OUT}/{name}.png')
      await ctx.close()
    await b.close(); print('\n'.join(errs) or 'NO_ERRORS')
asyncio.run(main())
