# Bundled fonts

The app bundles two typefaces under the SIL Open Font License 1.1:

- **Fraunces** supplies the calendar numerals and month title. The app uses locally generated subsets renamed to Yidie Display. Original upstream TTF files are in the source directory; the license is beside this file. Regenerate the app subsets with python scripts/build_fonts.py.
- **Bagel Fat One** is used for short display copy. Its font file is in apps/mobile/assets/fonts/, and its license is beside this file.

Fraunces is from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/fraunces). Bagel Fat One is from [JAMO Typeface](https://github.com/JAMO-TYPEFACE/BagelFat). The app uses the built-in iOS Avenir Next for body text; Apple system fonts are not redistributed. No fonts are downloaded at runtime.

To regenerate the Fraunces subsets, install FontTools with python -m pip install fonttools, then run python scripts/build_fonts.py from the repository root.
