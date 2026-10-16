"""Rebuild the app's licensed Fraunces subsets as bundled TTF assets."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = REPOSITORY_ROOT / 'design/assets/fonts'
OUTPUT_ROOT = REPOSITORY_ROOT / 'apps/mobile/assets/fonts'
for suffix in ('', '-Italic'):
    font = TTFont(SOURCE_ROOT / f'Fraunces{suffix}.ttf')
    font = instantiateVariableFont(font, {'wght': 600, 'opsz': 48, 'SOFT': 30, 'WONK': 1}, inplace=True)
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_legacy = True
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=list(range(32, 127)) + [0x2018, 0x2019, 0x2013, 0x2014])
    sub.subset(font)
    family = 'Yidie Display' + (' Italic' if suffix else '')
    postscript = 'YidieDisplay' + ('Italic' if suffix else '')
    for name in font['name'].names:
        if name.nameID in (1, 4, 16): value = family
        elif name.nameID == 6: value = postscript
        elif name.nameID == 3: value = f'1.0;YIDIE;{postscript}'
        elif name.nameID in (2, 17): value = 'Regular'
        else: continue
        name.string = value.encode(name.getEncoding())
    font.save(OUTPUT_ROOT / f'{postscript}.ttf')
    print(postscript)
