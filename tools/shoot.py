import asyncio,sys
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        errs=[]
        for name,vp,hash_,extra in [
            ('mobile-read',{'width':360,'height':800},'#read/wudu',None),
            ('fold-open-read',{'width':720,'height':860},'#read/tahara',None),
            ('desktop-read',{'width':1440,'height':900},'#read/sahw',None),
            ('mobile-message',{'width':360,'height':800},'#message',None),
            ('mobile-review',{'width':360,'height':800},'#review',None),
            ('desktop-coverage',{'width':1280,'height':900},'#coverage',None),
            ('mobile-dark-jumua',{'width':360,'height':800},'#read/jumua','dark'),
            ('mobile-search',{'width':360,'height':800},'#read/salat','search'),
        ]:
            ctx=await b.new_context(viewport=vp,device_scale_factor=2,is_mobile=vp['width']<800,has_touch=vp['width']<800)
            pg=await ctx.new_page()
            pg.on('console',lambda m: errs.append(f'{name}: {m.type}: {m.text}') if m.type in('error','warning') else None)
            pg.on('pageerror',lambda e: errs.append(f'{name}: PAGEERROR {e}'))
            if extra=='dark':
                await pg.goto(BASE); await pg.evaluate("localStorage.setItem('mfq.settings',JSON.stringify({theme:'dark',layout:'stack'}))")
            await pg.goto(BASE+hash_); await pg.reload(); await pg.wait_for_timeout(1800)
            if extra=='search':
                await pg.click('#btnSearch'); await pg.fill('#q','الدلك'); await pg.wait_for_timeout(700)
            await pg.screenshot(path=f'shots/{name}.png',full_page=False)
            await ctx.close()
        await b.close()
        print('\n'.join(errs) or 'NO_ERRORS')
asyncio.run(main())
