import asyncio
from playwright.async_api import async_playwright
def svg(mask=False, mono=False):
    # star8 rosette + م, ink background with gold
    s = 0.78 if mask else 1.0   # maskable: keep art inside 80% safe zone
    bg = '<rect width="512" height="512" fill="url(#bg)"/>' if mask else '<rect width="512" height="512" rx="112" fill="url(#bg)"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#173033"/><stop offset="1" stop-color="#07100f"/></radialGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9ae"/><stop offset=".5" stop-color="#d8b25a"/><stop offset="1" stop-color="#9a7428"/></linearGradient></defs>
{bg}
<g transform="translate(256 256) scale({s}) translate(-256 -256)">
<g fill="none" stroke="url(#g)">
<path stroke-width="12" d="M256 52l46 92 98-34-34 98 92 46-92 46 34 98-98-34-46 92-46-92-98 34 34-98-92-46 92-46-34-98 98 34z"/>
<path stroke-width="5" opacity=".75" d="M256 112l30 60 64-22-22 64 60 30-60 30 22 64-64-22-30 60-30-60-64 22 22-64-60-30 60-30-22-64 64 22z"/>
<circle cx="256" cy="256" r="118" stroke-width="3" opacity=".5"/></g>
<text x="256" y="330" font-size="230" stroke="#07100f" stroke-width="2" text-anchor="middle" fill="url(#g)" font-family="Reem Kufi" font-weight="700">م</text>
</g></svg>'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':512,'height':512})
        for name, mask in [('icon', False), ('maskable', True)]:
            open(f'assets/icons/{name}.svg','w').write(svg(mask))
            html = '<html><head><link href="https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@700&display=block" rel="stylesheet"><style>body{margin:0;background:transparent}</style></head><body>'+svg(mask)+'</body></html>'
            await pg.set_content(html); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'/tmp/{name}-512.png', omit_background=True, clip={'x':0,'y':0,'width':512,'height':512})
        await b.close()
asyncio.run(main())
from PIL import Image
for name in ['icon','maskable']:
    im = Image.open(f'/tmp/{name}-512.png').convert('RGBA')
    for sz in [48,72,96,128,144,192,256,384,512]:
        im.resize((sz,sz), Image.LANCZOS).save(f'assets/icons/{name}-{sz}.png', optimize=True)
m = Image.open('/tmp/maskable-512.png').convert('RGB')
m.resize((180,180), Image.LANCZOS).save('assets/icons/apple-touch-icon.png')
Image.open('/tmp/icon-512.png').resize((32,32), Image.LANCZOS).save('assets/icons/favicon-32.png')
print('ok')
