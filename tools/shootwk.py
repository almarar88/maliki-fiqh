import asyncio,sys,json
from playwright.async_api import async_playwright
BASE=sys.argv[1]; OUT=sys.argv[2]; W=int(sys.argv[3]) if len(sys.argv)>3 else 430
THEME=sys.argv[4] if len(sys.argv)>4 else 'parchment'
H={430:932,390:844}.get(W,900)
CASES=[('home','#home',None),('nabdha','#home','nabdha'),('home-full','#home','full'),('read','#read/wudu',None),('read-nikah','#read/nikah','ibar'),
('review','#review',None),('study','#study',None),('ai','#ai',None),('more','#home','more'),('library','#library',None),('about','#about',None),('map','#map',None),('coverage','#coverage',None)]
only=sys.argv[5].split(',') if len(sys.argv)>5 else None
async def main():
  import os; os.makedirs(OUT,exist_ok=True)
  async with async_playwright() as p:
    b=await p.webkit.launch(); errs=[]
    for name,hs,extra in CASES:
      if only and name not in only: continue
      ctx=await b.new_context(viewport={'width':W,'height':H},device_scale_factor=2,is_mobile=True,has_touch=True,
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')
      pg=await ctx.new_page()
      pg.on('pageerror',lambda e,n=name: errs.append(f'{n}: PAGEERROR {e}'))
      await ctx.add_init_script("localStorage.setItem('mfq.settings',"+json.dumps(json.dumps({'theme':THEME,'layout':'stack'}))+")")
      await pg.goto(BASE+hs); await pg.wait_for_timeout(3500)
      if extra=='nabdha':
        await pg.evaluate("document.querySelector('.nabdha,.nb,#nabdha')?.scrollIntoView({block:'start'}); scrollBy(0,-70)"); await pg.wait_for_timeout(1500)
      if extra=='more':
        await pg.click('#tabbar [data-more]'); await pg.wait_for_timeout(700)
      if extra=='ibar':
        await pg.click('#card-risala .txt p[data-ik]'); await pg.wait_for_timeout(600)
      ov=await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
      if ov>2: errs.append(f'{name}: HORIZONTAL OVERFLOW {ov}px')
      if extra=='full':
        hh=await pg.evaluate('document.documentElement.scrollHeight'); k=0; y=0
        while y<hh:
          await pg.evaluate(f'scrollTo(0,{y})'); await pg.wait_for_timeout(900)
          await pg.screenshot(path=f'{OUT}/{name}-{k}.png'); k+=1; y+=H-160
      else:
        await pg.screenshot(path=f'{OUT}/{name}.png')
      await ctx.close()
    await b.close(); print('\n'.join(errs) or 'NO_ERRORS')
asyncio.run(main())
