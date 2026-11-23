import asyncio,json
from playwright.async_api import async_playwright
BASE='https://almarar88.github.io/maliki-fiqh/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    async def ctx(w,h,st=None):
      c=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if w<800 else 1,is_mobile=w<800,has_touch=w<800,color_scheme='dark')
      if st: await c.add_init_script("localStorage.setItem('mfq.settings',"+json.dumps(json.dumps(st))+")")
      pg=await c.new_page(); pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); return c,pg
    c,pg=await ctx(1440,900); await pg.goto(BASE+'#home'); await pg.wait_for_timeout(3000)
    v=await pg.evaluate("[document.querySelector('script[src^=app]').src, typeof document.startViewTransition]"); print('live script',v)
    await pg.screenshot(path='shots-live/desktop-home.png'); await c.close()
    c,pg=await ctx(412,900); await pg.goto(BASE+'#ai'); await pg.wait_for_timeout(2000)
    await pg.fill('#askq','ما فرائض الوضوء؟'); await pg.click('#askbtn')
    await pg.wait_for_selector('.msg.bot:not(#pending) .body',timeout=60000); await pg.wait_for_timeout(1200)
    await pg.evaluate("document.querySelector('.msg.bot .body').scrollIntoView({block:'start'})"); await pg.evaluate("scrollBy(0,-120)")
    await pg.screenshot(path='shots-live/mobile-ai-answer.png'); await c.close()
    c,pg=await ctx(1440,900,{'layout':'side'}); await pg.goto(BASE+'#read/wudu'); await pg.wait_for_timeout(2500)
    await pg.click('#card-ashir [data-act=explain]'); await pg.wait_for_selector('#aiOut .msg',timeout=60000); await pg.wait_for_timeout(600)
    await pg.screenshot(path='shots-live/desktop-explain.png')
    await pg.keyboard.press('Escape'); await pg.click('[data-act=aicmp]'); await pg.wait_for_selector('#aiOut .msg',timeout=90000); await pg.wait_for_timeout(600)
    await pg.screenshot(path='shots-live/desktop-ai-compare.png'); await c.close()
    c,pg=await ctx(412,900); await pg.goto(BASE+'#review'); await pg.wait_for_timeout(2000)
    await pg.click('[data-mode=ai]'); await pg.wait_for_selector('.opt.ai',timeout=90000); await pg.click('.opt.ai'); await pg.wait_for_timeout(900)
    await pg.screenshot(path='shots-live/mobile-ai-quiz.png'); await c.close()
    # animation frames for GIF
    c,pg=await ctx(720,860); await pg.goto(BASE+'#home'); await pg.wait_for_timeout(300)
    for i in range(36):
      await pg.screenshot(path=f'shots-live/f{i:02d}.png'); await pg.wait_for_timeout(110)
    await pg.click('[data-go=map]')
    for i in range(36,52):
      await pg.screenshot(path=f'shots-live/f{i:02d}.png'); await pg.wait_for_timeout(110)
    await c.close(); await b.close(); print('\n'.join(errs) or 'NO_ERRORS')
asyncio.run(main())
