# 衣叠 iOS 工程

Expo SDK 57 / React Native 0.86 / React 19.2 / TypeScript。当前是阶段 1–2 的开发验证版本，完整 iOS 编译和真机验收尚未完成。

## 本地运行

需要 Node 22.13+、macOS 26.2+、Xcode 26.4+ 与兼容 CocoaPods。若安装更新的 Xcode，先查 [Apple 兼容表](https://developer.apple.com/xcode/system-requirements)；不同版本对 macOS 的要求不同。

```sh
cd apps/mobile
npm ci
npm run check
npm run ios
```

真机构建需在本机使用自己的 Apple 账号配置签名。使用 `npm run ios -- --device` 选择设备；最终离线验证使用 `npm run ios:release -- --device`。不要提交证书、Team ID 或描述文件。

Expo Go 不包含 `yidie-native`。本地模块源代码位于 `modules/yidie-native`，`ios/` 由配置再生并被忽略。`npm run prebuild:ios` 只生成工程，不代表编译成功；`npm run export:ios` 只证明 JS 与资源可打包，不代表 App 能在真机运行。

## 当前代码范围

- 月历当前月、跨年切月、占位数字、最多三层贴纸、当天横向浏览。
- 数字/月份使用离线 Fraunces 子集，中文使用苹方；源许可证随包保留。
- PhotoKit 本地资产分页和缩略图，所有请求禁止网络；单张读取、日期确认、Vision/白边/缩略图。
- SQLite 初始化、事务、记录查询；处理中断后标记暂停。取消尚未归档的导入会清理其文件。
- 日期、布局与失败路径测试；ESLint 模块边界和循环依赖检查；统一代码格式。

生成成功后会显示保存提示。无拍摄日期的照片可留空，记录进入“全部记录”中的待归档；日期编辑还未接入。多人照片当前保留全部前景主体，主体选择未实现。

批量队列、重试、编辑/封面操作、导出、完整备份恢复、崩溃后的孤儿文件回收仍属于后续阶段。当前只用于测试照片，不能把未完成版本当作长期照片库。

工程约定见 [架构说明](../../docs/10-engineering.md)，验证与限制见 [实施记录](../../docs/09-build-log.md)。
