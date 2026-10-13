#!/usr/bin/env python3
"""Build offline, dependency-free design previews. Does not build the iOS app."""
from pathlib import Path
import base64
import argparse

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--inline-output', type=Path)
args = parser.parse_args()
source = (ROOT / 'design/prototype.source.html').read_text()
asset = base64.b64encode((ROOT / 'design/assets/outfit-sprites.webp').read_bytes()).decode()
fragment = source.replace('__SPRITE_DATA__', 'data:image/webp;base64,' + asset)
for key, name in [('__FONT_ROMAN__', 'YidieDisplay'), ('__FONT_ITALIC__', 'YidieDisplayItalic')]:
    data = base64.b64encode((ROOT / f'design/assets/fonts/{name}.woff2').read_bytes()).decode()
    fragment = fragment.replace(key, 'data:font/woff2;base64,' + data)
assert len(fragment.encode()) < 1_000_000
(ROOT / 'design/prototype.fragment.html').write_text(fragment)
wrapper = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>衣叠 · 交互设计</title><style>body{margin:0;background:#f6f6f4;padding:20px 8px}html{scrollbar-width:none}button{cursor:pointer}@media(max-width:360px){body{padding:20px 0}}</style></head><body>'
(ROOT / 'design/index.html').write_text(wrapper + fragment + '</body></html>')
screens = [('calendar','月历'),('day','同日多张'),('import','批量导入'),('edit','贴纸编辑'),('export','月历海报'),('settings','本地数据'),('empty','首次打开'),('errors','异常状态'),('dense','满月排版')]
board = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>衣叠 · 全部界面</title><style>body{margin:0;padding:40px;background:#efefed;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#121212}h1{font-size:36px;margin:0 0 8px}p{color:#777}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:36px 24px}article{text-align:center}iframe{width:100%;max-width:410px;height:875px;border:0;border-radius:32px}h2{font-size:15px;font-weight:500;margin:24px 0 12px}</style><h1>衣叠 / Yidie</h1><p>把穿过的日子，一张张叠起来。 · v0.1 UI / 2026.10</p><main>'
for key, label in screens:
    board += f'<article><h2>{label}</h2><iframe title="{label}" src="index.html?board=1#{key}" loading="lazy"></iframe></article>'
board += '</main></html>'
(ROOT / 'design/overview.html').write_text(board)
if args.inline_output:
    args.inline_output.write_text(fragment)
print('Built design/index.html, overview.html and inline fragment.')
