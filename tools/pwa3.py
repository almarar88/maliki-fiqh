import asyncio,sys,json
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
MODE=sys.argv[2] if len(sys.argv)>2 else 'both'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    if MODE in('both','screens'):
      for name,w,h,dpr,hs,st in [('narrow-home',412,900,2,'#home',{}),('narrow-read',412,900,2,'#read/nikah',{'layout':'stack'}),('wide-read',1440,900,1,'#read/buyu',{'layout':'side'})]:
        ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,is_mobile=w<800,has_touch=w<800,color_scheme='dark')
        await ctx.add_init_script("localStorage.setItem('mfq.settings',"+json.dumps(json.dumps(st))+")")
        pg=await ctx.new_page(); await pg.goto(BASE+hs); await pg.wait_for_timeout(3000)
        await pg.screenshot(path=f'assets/screens/{name}.png'); await ctx.close()
    if MODE in('both','install'):
      ctx=await b.new_context(viewport={'width':412,'height':900}); pg=await ctx.new_page()
      await pg.goto(BASE); await pg.wait_for_timeout(4000)
      await pg.reload(); await pg.wait_for_timeout(3000)
      cdp=await ctx.new_cdp_session(pg)
      r=await cdp.send('Page.getInstallabilityErrors'); print('installabilityErrors:',json.dumps(r,ensure_ascii=False))
      m=await cdp.send('Page.getAppManifest'); print('manifest url:',m.get('url'),'errors:',m.get('errors'))
      print('sw controller:',await pg.evaluate("!!navigator.serviceWorker.controller"))
      print('caches:',await pg.evaluate("caches.keys()"))
      n=await pg.evaluate("caches.keys().then(ks=>caches.open(ks.find(k=>k.startsWith('mfq-v')))).then(c=>c.keys()).then(k=>k.map(r=>r.url.split('/').slice(-2).join('/')))"); print('cached',len(n),n[:20])
      await ctx.set_offline(True); await pg.goto(BASE+'#read/faraid'); await pg.wait_for_timeout(2500)
      print('offline read ok:', await pg.evaluate("document.querySelectorAll('.card').length"), (await pg.title())[:30])
      await pg.screenshot(path='shots3/offline-read.png')
    await b.close()
asyncio.run(main())
