# WebKit with real device profiles; fresh context each page. usage: shootdev.py BASE OUT DEVICE THEME [cases]
import asyncio,sys,json,os
from playwright.async_api import async_playwright
BASE,OUT,DEV=sys.argv[1],sys.argv[2],sys.argv[3]; THEME=sys.argv[4] if len(sys.argv)>4 else 'parchment'
CASES=[('home','#home',None),('nabdha','#home','nabdha'),('read','#read/wudu',None),('read-nikah','#read/nikah',None),('review','#review',None),('study','#study',None),('ai','#ai',None),('more','#home','more'),('library','#library',None),('about','#about',None),('map','#map',None),('coverage','#coverage',None),('message','#message',None),('home-scroll','#home','scroll'),('settings','#home','settings')]
only=sys.argv[5].split(',') if len(sys.argv)>5 else None
async def main():
  os.makedirs(OUT,exist_ok=True)
  async with async_playwright() as p:
    d=dict(p.devices[DEV]); d.pop('default_browser_type',None)
    b=await p.webkit.launch(); errs=[]
    for name,hs,extra in CASES:
      if only and name not in only: continue
      ctx=await b.new_context(**d); pg=await ctx.new_page()
      pg.on('pageerror',lambda e,n=name: errs.append(f'{n}: PAGEERROR {e}'))
      await ctx.add_init_script("localStorage.setItem('mfq.settings',"+json.dumps(json.dumps({'theme':THEME,'layout':'stack'}))+")")
      await pg.goto(BASE+hs); await pg.wait_for_timeout(3500)
      if extra=='nabdha':
        await pg.evaluate("document.querySelector('.nabdha').scrollIntoView({block:'start'}); scrollBy(0,-70)"); await pg.wait_for_timeout(1500)
      if extra=='more': await pg.evaluate("document.querySelector('#tabbar [data-more]').click()"); await pg.wait_for_timeout(700)
      if extra=='settings': await pg.click('#btnMenu'); await pg.wait_for_timeout(700)
      ov=await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
      if ov>2: errs.append(f'{name}: HORIZONTAL OVERFLOW {ov}px')
      # clipped-text audit: elements whose text overflows their box
      clip=await pg.evaluate("""[...document.querySelectorAll('button,h1,h2,h3,h4,b,span,small,p,li,a')].filter(e=>{const s=getComputedStyle(e);if(s.display=='none'||!e.offsetParent)return false;return (e.scrollWidth>e.clientWidth+2 && (s.overflow=='hidden'||s.overflowX=='hidden'||s.textOverflow=='ellipsis'))}).slice(0,8).map(e=>e.tagName+'.'+e.className+': '+e.textContent.trim().slice(0,30))""")
      if clip: errs.append(f'{name}: CLIPPED {clip}')
      if extra=='scroll':
        hh=await pg.evaluate('document.documentElement.scrollHeight'); vh=d['viewport']['height']; k=0; y=0
        while y<hh:
          await pg.evaluate(f'scrollTo(0,{y})'); await pg.wait_for_timeout(800); await pg.screenshot(path=f'{OUT}/{name}-{k}.png'); k+=1; y+=vh-140
      else: await pg.screenshot(path=f'{OUT}/{name}.png')
      await ctx.close()
    await b.close(); print('\n'.join(errs) or 'NO_ERRORS')
asyncio.run(main())
