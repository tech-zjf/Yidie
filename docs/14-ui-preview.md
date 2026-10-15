# App UI 开发预览

此入口复用实际 React Native 组件，提供固定数据，方便在相同条件下检查布局。不连接真实数据库、不访问照片权限、不生成 Vision 结果。几何占位图只用于尺寸和叠放检查，不是最终穿搭素材。

## 运行

在 `apps/mobile` 中执行：

```sh
npm run preview:ios
```

随后在兼容的 iOS 开发环境打开。该命令启动的是预览 Metro 服务，不会自动证明原生编译成功。进入后先选择场景；场景选择器关闭后，月历仍占完整可用屏幕，右上方的小型“Preview scenes”按钮用于再次切换。当天弹层与记录编辑沿用 App 的真实入口。

录制 README 或社交媒体演示时，可用无场景菜单的入口，让首屏直接显示固定的日常样例：

```sh
npm run preview:clean
```

演示入口仍是只读合成数据；只隐藏开发场景控件，不会访问 Photos 或真实记录。`preview:ios` 仍保留场景切换器供验收使用。

| 场景 | 检查内容 |
| --- | --- |
| 日常与同日多张 | 2026 年 6 月；单张、相邻两周、同日 10 张，月格最多 3 层，弹层可横向访问全部记录 |
| 31 天六周满月 | 2026 年 8 月；密集布局、前后空格、最下排和底部操作区 |
| 四周月份 | 2026 年 2 月；四排与较少留白时的整体布局 |
| 空白月历 | 数字、当前日与空态 |
| 处理与失败状态 | queued/running/failed/paused 的照片预览与状态；全部记录中有待归档项 |
| 导入确认 | 日期分组、未知日期、默认跳过重复、来源不可用、改单张/整组日期 |

预览里的删除、保存、重试、照片权限和队列写入均拒绝执行；贴纸描边预览与保存只作用于内存样例；导入确认仅提示预览状态，编辑分组只改当前内存。真实业务行为由独立领域/SQLite 测试和后续真机流程验收。

## 隔离与构建检查

`metro.config.js` 仅在显式设置 `YIDIE_UI_PREVIEW=1` **且** Metro 正在生成 development bundle 时，将根 `index.ts` 对 `./App` 的解析指向 `src/preview/PreviewRoot.tsx`。其他解析交回 Metro；参考 [Expo 自定义 resolver 文档](https://docs.expo.dev/guides/customizing-metro/)。不在正式入口中写运行时分支或导入 fixture。场景菜单只在单独设置 `EXPO_PUBLIC_YIDIE_PREVIEW_CONTROLS=1` 时显示；无菜单演示入口因此不污染正式 UI 截图。

预览服务只通过类型引用 AppServices，所有平台端口是只读替身，不导入真实服务装配与原生适配器。固定图片是内嵌 SVG，不使用远程素材。预览文案集中在独立开发入口；正式业务提示仍在共享文案表。

本轮执行过：

```sh
npm run preview:export
YIDIE_UI_PREVIEW=1 npm run export:ios -- --no-bytecode
```

检查导出的可读 JS：`dist-preview` 含 `preview-only` 场景标记，不含 `YidieNative`/真实数据库装配；`dist` 不含场景标记与占位素材，包含真实原生模块引用。第二条特意保留预览变量，用来验证 production 构建仍走正式入口。两个输出目录均已忽略，不提交。

## 原生运行验收边界

2026-10-15 在独立的 **Yidie QA iPhone 18 Pro / iOS 27 Simulator** 上重新打开 Debug 预览，检查了 populated/empty calendar、数量角标、十张同日记录弹层、描边预览与保存、All Records、导入确认及合成失败状态。描边保存后在日期弹层可见，导入页没有场景菜单遮挡。预览只验证界面和内存替身，不代表原生 PhotoKit/Vision 行为。之前 Release 空日历截图仍保存在 [`design/screenshots/app-empty-calendar.png`](../design/screenshots/app-empty-calendar.png)。

尚需逐项验证日/月份触控滑动、窄屏、大字体、VoiceOver、减弱动态效果、原生 Files 备份/恢复、分享面板和系统日期选择。真实抠图质量、离线行为、内存与性能必须用用户主动选择的测试照片在真机检查；不得将几何占位素材当成真实效果。
