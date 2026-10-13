# 字体

拉丁月份与日期采用 Fraunces 的本地静态子集（600 字重，48 光学字号，SOFT 30、WONK 1），修改后的字体命名为 Yidie Display / Yidie Display Italic。中文使用设备已有的苹方 SC（常规与中等），不分发 Apple 字体文件。

原始文件来自 [Google Fonts 的 Fraunces 目录](https://github.com/google/fonts/tree/main/ofl/fraunces)，采用 [SIL Open Font License 1.1](OFL.txt)。原始 TTF 和许可证保留用于复现。改名后的 TTF 用于 App，WOFF2 用于离线设计预览，无运行时字体请求。

维护者安装 `fonttools` 和 `brotli` 后运行 `python scripts/build_fonts.py` 重建。普通开发者使用仓库内已生成的文件即可。
