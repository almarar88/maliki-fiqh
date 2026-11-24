import asyncio
from playwright.async_api import async_playwright
B='https://almarar88.github.io/maliki-fiqh/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    for nm,w,h in [('mobile',412,900),('desktop',1440,900)]:
      c=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if w<800 else 1,is_mobile=w<800,has_touch=w<800,color_scheme='dark')
      pg=await c.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
      await pg.goto(B+'#home'); await pg.wait_for_timeout(2500)
      print(nm, await pg.evaluate("[document.title, !!document.querySelector('.hero-credit'), !!document.querySelector('.nabdha'), document.querySelectorAll('.nabdha .ibadge').length, !!document.querySelector('.site-foot .credit'), document.querySelector('script[src^=app]').src]"))
      await pg.screenshot(path=f'shots-credit/{nm}-hero.png')
      await pg.evaluate("document.querySelector('.nabdha').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(1500)
      await pg.screenshot(path=f'shots-credit/{nm}-nabdha-home.png')
      await pg.evaluate("scrollTo(0,document.body.scrollHeight)"); await pg.wait_for_timeout(1200)
      await pg.screenshot(path=f'shots-credit/{nm}-footer.png')
      await pg.click('#views [data-view=about]') if w>860 else await pg.goto(B+'#about')
      await pg.wait_for_timeout(2000); await pg.screenshot(path=f'shots-credit/{nm}-about.png')
      await pg.goto(B+'#message'); await pg.wait_for_timeout(1500); await pg.click('.pickers .sym')
      await pg.wait_for_timeout(500); print(nm,'msg ends:', (await pg.input_value('#mout'))[-60:])
      await c.close()
    await b.close(); print(errs or 'NO_ERRORS')
asyncio.run(main())
