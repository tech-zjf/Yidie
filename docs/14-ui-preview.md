# App UI 开发预览

此入口复用实际 React Native 组件，提供固定数据，方便在相同条件下检查布局。不连接真实数据库、不访问照片权限、不生成 Vision 结果。几何占位图只用于尺寸和叠放检查，不是最终穿搭素材。

## 运行

在 `apps/mobile` 中执行：

```sh
npm run preview:ios
```

随后在兼容的 iOS 开发环境打开。该命令启动的是预览 Metro 服务，不会自动证明原生编译成功。进入后先选择场景；场景选择器关闭后，月历仍占完整可用屏幕，右上方的小型“预览场景”按钮用于再次切换。当天弹层与记录编辑沿用 App 的真实入口。

| 场景 | 检查内容 |
| --- | --- |
| 日常与同日多张 | 2026 年 6 月；单张、相邻两周、同日 10 张，月格最多 3 层，弹层可横向访问全部记录 |
| 31 天六周满月 | 2026 年 8 月；密集布局、前后空格、最下排和底部操作区 |
| 四周月份 | 2026 年 2 月；四排与较少留白时的整体布局 |
| 空白月历 | 数字、当前日与空态 |
| 处理与失败状态 | queued/running/failed/paused 的照片预览与状态；全部记录中有待归档项 |
| 导入确认 | 日期分组、未知日期、默认跳过重复、来源不可用、改单张/整组日期 |

预览里的删除、保存、重试、照片权限和队列写入均拒绝执行；导入确认仅提示预览状态，编辑分组只改当前内存。真实业务行为由独立领域/SQLite 测试和后续真机流程验收。

## 隔离与构建检查

`metro.config.js` 仅在显式设置 `YIDIE_UI_PREVIEW=1` **且** Metro 正在生成 development bundle 时，将根 `index.ts` 对 `./App` 的解析指向 `src/preview/PreviewRoot.tsx`。其他解析交回 Metro；参考 [Expo 自定义 resolver 文档](https://docs.expo.dev/guides/customizing-metro/)。不在正式入口中写运行时分支或导入 fixture。

预览服务只通过类型引用 AppServices，所有平台端口是只读替身，不导入真实服务装配与原生适配器。固定图片是内嵌 SVG，不使用远程素材。预览文案集中在独立开发入口；正式业务提示仍在共享文案表。

本轮执行过：

```sh
npm run preview:export
YIDIE_UI_PREVIEW=1 npm run export:ios -- --no-bytecode
```

检查导出的可读 JS：`dist-preview` 含 `preview-only` 场景标记，不含 `YidieNative`/真实数据库装配；`dist` 不含场景标记与占位素材，包含真实原生模块引用。第二条特意保留预览变量，用来验证 production 构建仍走正式入口。两个输出目录均已忽略，不提交。

## 原生运行验收边界

2026-10-14 已在 iPhone 18 Pro / iOS 27 Simulator 上构建、安装并启动 Release app，空首页截图为 [`design/screenshots/app-empty-calendar.png`](../design/screenshots/app-empty-calendar.png)。该截图仅证明空日历启动和首屏布局；随后 CoreSimulator 服务断开，无法继续用 UI 操作逐一走场景。预览场景代码可用于后续复验，但不等于实际 PhotoKit/Vision 内容。

后续逐项验证窄屏、常用尺寸、大字体、日历叠图/数量角标、弹层滑动与收起、贴纸样式预览保存、全部记录、备份/恢复、分享和日期选择。真实抠图质量、离线行为、内存与性能必须用用户主动选择的测试照片在真机检查；不得将几何占位素材当成真实效果。
