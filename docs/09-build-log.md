# 实施与验证记录

2026-10-13。公开仓库：[tech-zjf/Yidie](https://github.com/tech-zjf/Yidie)。当前为阶段 1–2 的实现与技术验证基线，尚未通过原生完整构建与真机验收。

## 已完成

- PRD、技术方案、UI、命名与实施顺序全量审查，增加工程约定与模块依赖检查。
- 字体优化：Yidie Display 正体数字、Italic 月份、苹方中文。本地字体文件和 OFL 许可证入库，运行时不下载字体。
- 初始化 Expo SDK 57、RN 0.86.3、React 19.2.3，提交 npm lockfile。生成的 iOS 工程不提交。
- RN 月历、当天弹层、单张选照与确认日期、记录列表；按月查询、列表每页 60 条。
- Swift PhotoKit、Vision 与文件管理模块；SQLite 初始化、事务与失败状态；相册与 App 自有文件职责分开。
- 真正的本地代码已加入仓库，网页里的假导入流程未移植到 App。

## 实际通过的检查

| 检查 | 结果与范围 |
| --- | --- |
| TypeScript 严格类型检查 | 通过，包含未使用项检查 |
| ESLint | 通过，含模块依赖边界与循环依赖 |
| Prettier | 通过 |
| 领域与用例测试 | 8 项通过；公历、时区、跨年、4/5/6周、贴纸边界、导入成功/失败所有权 |
| 文档与 SQL 契约 | 通过；本地链接、封面归属、待归档、ready约束、移动/删除、运行时 SQL 同源 |
| Expo 本地模块自动链接 | 已发现 YidieNative 与 YidieNativeModule |
| iOS prebuild | 成功，生成 iOS17 最低版本、照片权限、字体与关闭更新配置；不代表编译通过 |
| iOS JS/资源导出 | 成功，Hermes bundle 与两份本地字体；不代表原生程序可运行 |
| Swift 核心类型检查 | NativeFileStore、LocalPhotos、StickerProcessor 通过 iOS17 模拟器目标的类型检查；不包含 Expo 桥接最终链接 |
| 网页 UI | 月历、当天弹层、导出、六周与 320px 窄屏检查；不代表 RN 真机 UI 已验收 |

## 工具链与设备关口

用户选择新版 Expo，并稍后自行升级 macOS；随后再完成 Xcode 升级。检查时本机 macOS26.0、Xcode26.1.1，未满足 SDK57 的完整构建要求。需要 macOS26.2+ 与 Xcode26.4+；若选择更高版本 Xcode，按 Apple 兼容表同步确认 macOS。

没有可用的已连接物理 iPhone。因此未进行完整 CocoaPods/原生编译、模拟器安装运行、20张真实照片效果评估、真机离线 Release 冷启动、网络检查或内存基准。不能将 Swift 类型检查或 Expo export 写成“真机通过”。

升级之后，先执行完整 iOS 构建和阶段 2 真机门槛，再继续批量、备份与导出。若失败，先修复本地模块与构建，不扩大功能范围。

## 依赖安全记录

初始化审计发现 uuid <11.1.1 的告警，已将 xcode 构建依赖中的 uuid 覆盖为兼容 CommonJS 的 11.1.1，并通过 prebuild 验证。没有运行会将 Expo 降级到 44 的 `npm audit fix --force`。

仍有两个上游底层问题通过依赖树传播为 15 项 high 告警：

- [braces 深层模式栈耗尽](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)：当前 npm 最新 3.0.3 仍在受影响范围。位于 Metro/文件匹配工具链。
- [node-forge 签名校验问题](https://github.com/advisories/GHSA-86w9-cpqp-85rv)：当前 npm 最新 1.4.0 仍在受影响范围。位于 Expo CLI/代码签名证书工具链。

当前应用代码未调用这些 Node 工具处理用户图片，未配置 OTA 或业务网络，但这不等于审计清零。开发服务绑定 localhost；不处理不可信工程或远程更新制品。发布前必须复查并采用修复版本，或完成明确的可达性与替代方案评审。不能把依赖检查结果写成“无漏洞”。

## 自动检查

检查配置保存在 `.github/checks.yml.example`，尚未启用。初次上传时 GitHub 认证不具备修改 workflow 的权限，因此保留模板并完成本地检查。后续具备权限时再将模板放到 `.github/workflows/checks.yml`。

## 尚未实现的范围

持久批量任务调度与重试、修改日期、封面选择、主体选择、编辑、单张/月历导出、备份恢复、孤儿文件对账与正式 App 图标。初始化后的这些缺口均保留在实施方案中，不是已经通过验收的功能。

日期确认暂用明确的 YYYY-MM-DD 输入，正式首版再接入原生日期选择体验；当前多人物结果保留全部前景，未声称自动识别“主要人物”。
