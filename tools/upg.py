# simulate an installed old version, then deploy a new one and see what the open page / a relaunch shows
import asyncio,sys,os,subprocess
from playwright.async_api import async_playwright
OLD,NEW=sys.argv[1],sys.argv[2]; URL='http://localhost:8802/'
def swap(d): subprocess.run(['ln','-sfn',d,'/tmp/mfq_srv/cur'])
async def state(pg,label):
  await pg.wait_for_load_state('load')
  v=await pg.evaluate("(()=>{const s=[...document.scripts].map(x=>x.src).find(x=>/app\\.js/.test(x))||'';return s.split('v=')[1]+' hero2='+!!document.querySelector('.hero2')})()")
  c=await pg.evaluate("caches.keys()")
  print(f'{label}: app {v} caches {c}',flush=True)
async def main():
  swap(OLD)
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context('/tmp/mfq_prof',viewport={'width':430,'height':932}); ctx.set_default_timeout(20000)
    pg=ctx.pages[0] if ctx.pages else await ctx.new_page()
    await pg.goto(URL+'#home'); await pg.wait_for_timeout(4000); await pg.reload(); await pg.wait_for_timeout(3000)
    await state(pg,'installed old')
    print('swap',flush=True); swap(NEW); await pg.wait_for_timeout(500)
    navs=[]; pg.on('framenavigated',lambda f: navs.append(f.url) if f==pg.main_frame else None)
    # app resumed from background (no navigation): fire visibilitychange
    await pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(7000)
    print('navigations during resume:',len(navs),flush=True)
    await state(pg,'after resume (no reload)')
    await pg.goto(URL+'#home'); await pg.wait_for_timeout(5000)
    await state(pg,'after relaunch')
    await ctx.close()
asyncio.run(main())
