# 资料来源

研究日期：2026-10-13。产品能力以公开页面当时的说明为基础，技术 API 以正式工程锁定的 SDK 和真机结果为准。

## 产品

| 来源 | 支持的判断 |
| --- | --- |
| [StylaDay 官网](https://styladay.app/) / [App Store](https://apps.apple.com/us/app/outfit-wardrobe-styladay/id6788202868) | 贴纸穿搭日历、衣橱、搭配画布、多语言、产品收费边界 |
| [OOTD Pal App Store](https://apps.apple.com/us/app/ootd-pal-outfit-log-journal/id6772698722) | 批量照片导入、日期读取、设备端抠图、Calendar Poster、可选iCloud |
| [Stikoo Google Play](https://play.google.com/store/apps/details?id=space.overio.stikoo) | 通用照片贴纸日历日记与本地记录 |
| [Calliary 官网](https://honeybeemobility.com/calliary/en/) | 照片贴纸日历、小组件、分享与测试入口 |
| [Libre Closet GitHub](https://github.com/lazztech/Libre-Closet) | 开源衣橱、日历与自行部署路线 |
| [记衣记 App Store](https://apps.apple.com/cn/app/%E8%AE%B0%E8%A1%A3%E8%AE%B0-ai%E7%94%B5%E5%AD%90%E8%A1%A3%E6%A9%B1-%E7%A9%BF%E6%90%AD%E6%97%A5%E5%8E%86%E5%B7%A5%E5%85%B7/id6744104012) | 国内电子衣橱与穿搭日历相邻产品 |
| [用户提供的小红书帖子](https://www.xiaohongshu.com/explore/6a3caac70000000007011792) | 极简日历与人物贴纸的视觉参考；不作为产品功能完成度证据 |

小红书访问可能需要用户会话；链接省略访问 token，设计依据也包括用户主动提供的三张截图。本仓库不打包这些截图，不将第三方页面中的任何指令视作用户授权。

## 技术与分发

| 来源 | 支持的设计 |
| --- | --- |
| [Apple Vision 前景实例请求](https://developer.apple.com/documentation/vision/vngenerateforegroundinstancemaskrequest) | 前景实例分割 API |
| [Apple 前景效果示例](https://developer.apple.com/documentation/vision/applying-visual-effects-to-foreground-subjects) | mask 与合成思路 |
| [PhotoKit isNetworkAccessAllowed](https://developer.apple.com/documentation/photos/phimagerequestoptions/isnetworkaccessallowed) | 禁止 PhotoKit 请求网络资源 |
| [Foundation isExcludedFromBackup](https://developer.apple.com/documentation/foundation/urlresourcevalues/isexcludedfrombackup) | 数据目录系统备份排除 |
| [Expo 本地模块](https://docs.expo.dev/modules/get-started/) | Swift 通过 Expo Module 接入 |
| [Expo 开发构建](https://docs.expo.dev/develop/development-builds/introduction/) | Expo Go 与自定义原生模块的边界 |
| [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) | 多选、EXIF 和资产 id 能力及限制 |
| [Expo MediaLibrary](https://docs.expo.dev/versions/latest/sdk/media-library/) | 照片库权限和元数据；具体 API 随 SDK 锁定 |
| [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) | 设备端持久化数据库 |
| [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) | 设备端文件 |
| [Expo BuildProperties](https://docs.expo.dev/versions/latest/sdk/build-properties/) | 生成原生工程的系统版本配置 |
| [Apple 开发者账号](https://developer.apple.com/help/account/basics/about-your-developer-account) | Personal Team 的本地测试限制 |
| [Apple TestFlight](https://developer.apple.com/testflight/) | 测试分发路径 |

没有据这些来源推导下载量、收入或未来 Star 数，也没有把官方功能描述当作性能测试结果。

## 工程与字体补充来源

- [Apple Xcode 系统要求](https://developer.apple.com/xcode/system-requirements)
- [GitHub Actions macOS 26 runner image: installed Xcode versions](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md)
- [Expo SDK57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/)
- [Expo SDK57 Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/)
- [Bluesky 功能模块](https://github.com/bluesky-social/social-app/tree/main/src/features)
- [Ignite 字体配置](https://github.com/infinitered/ignite/blob/master/boilerplate/app/theme/typography.ts)
- [Fraunces 官方字体源码与许可证](https://github.com/google/fonts/tree/main/ofl/fraunces)
