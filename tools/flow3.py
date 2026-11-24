import asyncio,sys,json
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); errs=[]
    ctx=await b.new_context(viewport={'width':412,'height':900},device_scale_factor=2,is_mobile=True,has_touch=True,color_scheme='dark')
    pg=await ctx.new_page()
    pg.on('pageerror',lambda e: errs.append(f'PAGEERROR {e}'))
    pg.on('console',lambda m: errs.append(f'console {m.text}') if m.type=='error' else None)
    await pg.goto(BASE+'#read/nikah'); await pg.wait_for_timeout(2500)
    await pg.click('#card-khalil .txt p[data-ik]'); await pg.wait_for_timeout(300)
    await pg.click('#ibar [data-ia=srs]'); await pg.wait_for_timeout(300)
    await pg.click('#card-risala .txt p[data-ik] >> nth=1'); await pg.wait_for_timeout(300)
    await pg.click('#ibar [data-ia=hl]'); await pg.wait_for_timeout(300)
    await pg.click('#card-bashar .verse[data-ik]'); await pg.wait_for_timeout(300)
    await pg.click('#ibar [data-ia=note]'); await pg.wait_for_timeout(300)
    await pg.fill('#noteTa','فائدة تجريبية: الولي ركن'); await pg.click('#noteSave'); await pg.wait_for_timeout(400)
    await pg.screenshot(path='shots3/flow-read-marks.png')
    print('hl count',await pg.evaluate("document.querySelectorAll('.hl').length"),'nmarks',await pg.evaluate("document.querySelectorAll('.nmark').length"))
    await pg.goto(BASE+'#study'); await pg.wait_for_timeout(1500)
    await pg.click('[data-stab=srs]'); await pg.wait_for_timeout(400)
    await pg.screenshot(path='shots3/flow-srs-front.png')
    await pg.click('[data-flip]'); await pg.wait_for_timeout(300)
    await pg.screenshot(path='shots3/flow-srs-back.png')
    await pg.click('[data-q="4"]'); await pg.wait_for_timeout(300)
    print('srs',(await pg.evaluate("localStorage.getItem('mfq.srs')"))[:200])
    await pg.click('[data-stab=notes]'); await pg.wait_for_timeout(400)
    await pg.screenshot(path='shots3/flow-notes.png',full_page=False)
    await pg.click('[data-stab=stats]'); await pg.wait_for_timeout(400)
    await pg.screenshot(path='shots3/flow-stats.png')
    async with pg.expect_download() as d:
      await pg.click('[data-stab=data]'); await pg.wait_for_timeout(300); await pg.click('#pExp')
    dl=await d.value; print('download',dl.suggested_filename)
    await pg.goto(BASE+'#library'); await pg.wait_for_timeout(1500)
    for t in ['khalil']:
      await pg.click(f'[data-lt={t}]'); await pg.wait_for_timeout(200)
      for tab in ['bio','shuruh','audio','gloss']:
        await pg.click(f'[data-ltab={tab}]'); await pg.wait_for_timeout(250)
        await pg.screenshot(path=f'shots3/flow-lib-{t}-{tab}.png')
    await pg.goto(BASE+'#review'); await pg.wait_for_timeout(1500); await pg.click('.opt'); await pg.wait_for_timeout(500)
    await pg.goto(BASE+'#coverage'); await pg.wait_for_timeout(1500); await pg.screenshot(path='shots3/flow-coverage.png')
    await pg.goto(BASE+'#about'); await pg.wait_for_timeout(1500)
    # offline AI message
    await ctx.set_offline(True); await pg.goto(BASE+'#ai'); await pg.wait_for_timeout(1500)
    await pg.fill('#askq','ما أركان النكاح؟'); await pg.click('#askbtn'); await pg.wait_for_timeout(800)
    await pg.screenshot(path='shots3/flow-ai-offline.png')
    print('offline msg:', (await pg.inner_text('#chat'))[-160:])
    print('\n'.join(errs) or 'NO_ERRORS')
    await b.close()
asyncio.run(main())
