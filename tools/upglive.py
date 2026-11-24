# install the OLD build (from a git worktree) on the real live origin via routing, then release routing so the live site is reached
import asyncio,sys,os,mimetypes
from playwright.async_api import async_playwright
OLD=sys.argv[1]; L='https://almarar88.github.io/maliki-fiqh/'
def P(*a): print(*a,flush=True)
async def main():
  async with async_playwright() as p:
    os.system('rm -rf /tmp/mfq_prof_live')
    ctx=await p.chromium.launch_persistent_context('/tmp/mfq_prof_live',viewport={'width':393,'height':852},service_workers='allow')
    async def serve_old(route):
      u=route.request.url.split('#')[0]; path=u[len(L):].split('?')[0] or 'index.html'
      fp=os.path.join(OLD,path)
      if os.path.isfile(fp): await route.fulfill(path=fp, content_type=mimetypes.guess_type(fp)[0] or 'application/octet-stream', headers={'cache-control':'max-age=600'})
      else: await route.continue_()
    await ctx.route(L+'**', serve_old)
    pg=ctx.pages[0]
    await pg.goto(L+'#home'); await pg.wait_for_timeout(5000); await pg.reload(); await pg.wait_for_timeout(3000)
    st=lambda: pg.evaluate("(()=>{const s=[...document.scripts].map(x=>x.src).find(x=>/app\\.js/.test(x))||'';return 'app '+s.split('v=')[1]+' hero2='+!!document.querySelector('.hero2')})()")
    P('installed old (routed):', await st(), await pg.evaluate('caches.keys()'))
    await ctx.unroute(L+'**')
    navs=[]; pg.on('framenavigated',lambda f: navs.append(f.url) if f==pg.main_frame else None)
    await pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(12000)
    await pg.wait_for_load_state('load')
    P('after resume, no user action: navigations',len(navs), await st(), await pg.evaluate('caches.keys()'))
    await pg.screenshot(path='shots-design/live32-upgraded-from-v30.png')
    await ctx.close()
asyncio.run(main())
