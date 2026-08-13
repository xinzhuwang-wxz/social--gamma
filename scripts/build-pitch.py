#!/usr/bin/env python3
"""花托邦路演构建：把 public/pitch/ 源码打成单文件 docs/pitch/index.html（GitHub Pages 入口）。
用法：改完 public/pitch/ 里的文件后，在仓库根目录执行  python3 scripts/build-pitch.py
仅用标准库。改了「文案文字」且出现缺字时会提示（需 pip install fonttools brotli 后重跑做字体子集）。"""
import base64, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'public', 'pitch')
INL = os.path.join(P, 'assets', 'inline')
OUT = os.path.join(ROOT, 'docs', 'pitch', 'index.html')

def b64(path):
    mime = {'webp':'image/webp','png':'image/png','woff2':'font/woff2'}[path.rsplit('.',1)[1]]
    return 'data:'+mime+';base64,'+base64.b64encode(open(path,'rb').read()).decode()
def rd(p): return open(p, encoding='utf-8').read()

html, css, js = rd(os.path.join(P,'index.html')), rd(os.path.join(P,'pitch.css')), rd(os.path.join(P,'pitch.js'))

world = {  # 大图 PNG → 仓库内压缩 webp
  '../world/assets/garden-world-v2.png':'garden.webp',
  '../world/assets/garden-background.png':'gbg.webp',
  '../world/assets/garden-scene.png':'scene.webp',
  '../world/assets/insect-butterfly.png':'butterfly.webp',
  '../world/assets/pet-actions/pet-walk.png':'petwalk.webp',
  '../world/assets/pet-actions/pet-idle.png':'petidle.webp',
  '../world/assets/pet-actions/pet-talk.png':'pettalk.webp',
  '../world/assets/pet-actions/pet-mail.png':'petmail.webp',
}
for n in range(1,9): world['../world/assets/flower-%d.png'%n] = 'flower%d.webp'%n
mapping = {k: os.path.join(INL,v) for k,v in world.items()}
for f in os.listdir(os.path.join(P,'assets')):
    fp = os.path.join(P,'assets',f)
    if os.path.isfile(fp): mapping['assets/'+f] = fp

js = js.replace("'<img src=\"../world/assets/' + m.f + '\"", "'<img src=\"' + m.f + '\"")
for n in [1,2,3,7,8]:
    js = js.replace('f: "flower-%d.png"'%n, 'f: "%s"'%b64(os.path.join(INL,'flower%d.webp'%n)))

def sub(s):
    for k,v in mapping.items():
        if k in s: s = s.replace(k, b64(v))
    return s
html, css, js = sub(html), sub(css), sub(js)

vendor = ''.join('<script>/*%s*/\n'%f + rd(os.path.join(P,'vendor',f)) + '\n</script>\n'
  for f in ['gsap.min.js','SplitText.min.js','DrawSVGPlugin.min.js','Flip.min.js','CustomEase.min.js','rough.js','confetti.js'])
out = html.replace('<link rel="stylesheet" href="pitch.css"/>', '<style>\n'+css+'\n</style>')
out = re.sub(r'<script src="vendor/[^"]+"></script>\s*', '', out)
out = out.replace('<script src="map-data.js"></script>', '<script>\n'+rd(os.path.join(P,'map-data.js'))+'\n</script>')
out = out.replace('<script src="pitch.js"></script>', vendor+'<script>\n'+js+'\n</script>')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT,'w',encoding='utf-8').write(out)
print('OK ->', os.path.relpath(OUT,ROOT), round(os.path.getsize(OUT)/1024), 'KB')

# 缺字检测（文案里出现字体子集没有的字时提醒）
try:
    from fontTools import ttLib
    fnt = ttLib.TTFont(os.path.join(P,'assets','lxgw-sub.woff2'))
    have = set(fnt.getBestCmap().keys())
    text = rd(os.path.join(P,'index.html')) + rd(os.path.join(P,'pitch.js'))
    miss = sorted({c for c in text if c.isprintable() and ord(c) > 0x2000 and ord(c) not in have and not (0xFE00 <= ord(c) <= 0xFE0F)})
    if miss: print('⚠ 新增文字缺字（会回退系统楷体）:', ''.join(miss), '\n  需要重做字体子集的话找 Bamboo/Claude。')
    else: print('字体子集覆盖完整 ✓')
except ImportError:
    print('(未装 fonttools，跳过缺字检测——只改样式/动效可忽略)')
