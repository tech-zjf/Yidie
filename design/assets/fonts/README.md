# Fonts

The English interface uses Bagel Fat One for short display copy and headings. Readable body copy, labels, and actions use the built-in iOS Avenir Next family; Apple system fonts are not redistributed. Fraunces is a bundled local subset for month titles and calendar numerals (600 weight, 48 optical size, SOFT 30, WONK 1), renamed Yidie Display / Yidie Display Italic. The calendar typography stays independent from the display-copy font.

Fraunces comes from [Google Fonts' Fraunces directory](https://github.com/google/fonts/tree/main/ofl/fraunces). Bagel Fat One comes from the [font author's repository](https://github.com/JAMO-TYPEFACE/BagelFat). Both use the SIL Open Font License 1.1; the corresponding license files are kept here. Original TTF files and licenses are kept for reproducibility. The renamed Fraunces TTF files and Bagel Fat One TTF are bundled with the app. No runtime font requests are made.

To rebuild the font subset, maintainers can install `fonttools` and `brotli`, then run `python scripts/build_fonts.py`. Other developers can use the generated files already in the repository.
