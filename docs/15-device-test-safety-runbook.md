# 真机开发者测试与安全回退记录

记录日期：2026-10-14  
适用项目：衣叠（`com.techzjf.yidie`）  
范围：个人 Apple 账号免费签名、Xcode 本地构建与本人 iPhone 测试。此记录不包含手机序列号或 UDID。

## 当前状态

- Apple 账号已在 Xcode 登录，使用免费 Personal Team；没有加入每年收费的 Apple Developer Program，也没有发生付费。
- Xcode 为衣叠启用了自动签名，并在本机登录钥匙串创建/使用 Apple Development 签名身份及 Xcode 管理的开发描述文件；该描述文件将本人 iPhone 注册为开发测试设备。
- iPhone 的 Developer Mode 已由用户开启；用户也在设备上信任了衣叠的开发者签名。
- bundle ID `com.techzjf.yidie`、版本 `0.1.0` 的衣叠已安装到 iPhone。没有更新或恢复 iOS，没有清除设备数据，也没有访问照片库或触碰其他 app。
- 用户在 macOS 钥匙串弹窗中选择了“始终允许”，授权 `codesign` 使用本机 Apple Development 私钥。这个授权保存在 Mac 登录钥匙串中，仍可撤销。
- 在系统允许的只读检查中，Mac 找到 1 个有效的 Apple Development 签名身份，且 Debug app 签名验证通过。先前受限命令环境报告的“未受信任”是沙箱读取钥匙串导致的误报，不是证书故障。
- 2026-10-14 已在 `/private/tmp/yidie-scene-device/Build/Products/Release-iphoneos/app.app` 构建修复后的签名 Release 包。签名身份为本机已有的 Apple Development；描述文件包含这台已授权测试设备，至 2026-10-21 17:42 CST 到期。安装包含 `main.jsbundle`，并已确认 `UIApplicationSceneManifest` 指向 `EXExpoAppSceneDelegate`。
- 修复版已用相同 bundle ID 覆盖安装到 iPhone，并通过 `devicectl` 成功启动。安装前后 iOS 返回的衣叠数据容器路径 UUID 不同；仅凭容器标识无法确认此前 app 内数据是否迁移/保留。停止进一步设备操作，不卸载、不清除、不恢复；需在手机上由用户检查衣叠本地记录是否仍在。
- Release 描述文件到期时间为 2026-10-21 09:42 UTC；Personal Team 免费测试签名有 7 天有效期。Xcode 构建过程另打印了一条未解释的账号凭据警告，但构建、签名核验和描述文件核验均成功；本轮没有重置或修改 Xcode 账号凭据。
- 已通过用户提供的衣叠单 app 崩溃报告定位到启动故障。报告显示 iOS 27.0.1 在 UIKit 创建首个场景时，因为 app 未采用 Scene 生命周期而触发 `EXC_BREAKPOINT (SIGTRAP)`；故障栈位于 `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`，发生在 React Native/JavaScript 界面启动之前。不是照片、数据库、签名信任或用户操作导致，也没有证据表明 app 数据损坏。没有查看其他 app 的报告内容。

## 已确认的问题与判断边界

这次已安装的签名 Release 包含有效的 `main.jsbundle`，但它是使用 Xcode 27 / iOS 27 SDK 构建的 Expo SDK 57 应用，仍保留旧的 application-based 生命周期，因此会在 JS 运行前被 iOS 27 主动终止。

源码修复：在 `apps/mobile/app.json` 的 `expo-build-properties` 中启用 `ios.enableSceneSupport`。Expo 官方回移插件会让 AppDelegate 提供 React Native factory，并在 Info.plist 声明 `EXExpoAppSceneDelegate`，将窗口创建与 React Native 启动交给 Scene 生命周期。该选项要求 Expo 57.0.23 或更新版本；本项目安装的是 Expo 57.0.28，满足要求。生成后的本地 Info.plist 与 AppDelegate 已确认包含 Scene 配置。

Prebuild 清理并重新生成了被 Git 忽略的 `ios/` 原生目录；Pods 已安装。iOS 27 模拟器 Release 构建和启动通过，日历主界面可见。修复版真机 Release 构建、签名和启动也成功，尚未验证真实照片处理、贴纸生成或日历上的现有记录。

### 本轮 Mac 构建工具变更

- 用户授权安装免费 CMake 与 CocoaPods 构建依赖。已安装 CMake 4.4.4；`pod install --no-repo-update` 成功，没有更新 CocoaPods spec repo，也没有从 GitHub 下载 Hermes 源码（使用本地缓存的预构建产物）。
- Homebrew 安装 CMake 时自动执行清理，意外移除了原有 `python@3.13` 和 `ripgrep`，并自动更新 Homebrew taps。随后已关闭自动更新/清理并恢复这两个工具；恢复时 Homebrew 将 Python 从 3.13.11 更新至 3.13.16、ripgrep 从 15.1.0 更新至 15.2.0，并更新 ca-certificates、OpenSSL、readline、SQLite、xz、pcre2。没有运行 `brew cleanup`。
- 如开发结束后确认不再需要 CMake，可运行 `HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1 brew uninstall cmake`。这不会自动回退上面 Homebrew 依赖的版本变更；不建议为了回退这些共享工具而强制降级，先检查其他项目是否使用它们。
- 真机签名构建需要在这次命令中指定 `CODE_SIGN_IDENTITY='Apple Development'`、`DEVELOPMENT_TEAM` 和自动签名；没有改写 Xcode 项目签名设置、证书或钥匙串访问控制。

## 下次测试步骤

1. 修复版已安装并启动。用户先在手机上检查衣叠原有本地记录是否存在；若记录缺失或不确定，先停，不卸载或清理。
2. 确认本地记录情况后，再由用户选择是否继续真机交互验收；在授权之前不要打开系统照片选择器或授予额外权限。
3. 任何需要更改安全设置、移除证书、清除 app 数据或接受新条款的操作都先停下并明确说明。

免费 Personal Team 适合个人设备测试，不等于可长期分发给他人：Apple 说明其测试描述文件 7 天到期；届时需重新签名并安装。免费方案的 App ID、设备和设备安装 app 数量也有限制。见 [Apple Developer 账号说明](https://developer.apple.com/help/account/basics/about-your-developer-account)。

## 安全变更与回退

| 项目 | 当前状态 | 回退方法与注意事项 |
| --- | --- | --- |
| iPhone Developer Mode | 已开启 | 在 iPhone“设置 → 隐私与安全性 → 开发者模式”关闭并按系统提示重启。此操作会重启手机；不需要恢复系统。测试完成后可关闭。 |
| iPhone 对开发者的信任 | 已由用户开启 | 信任会保留。先只删除衣叠 app；不要点击可能影响该开发者其他 app 的批量删除/撤销按钮，除非先确认其影响范围。设置入口为“设置 → 通用 → VPN 与设备管理”。 |
| 衣叠安装 | 修复版已安装并启动；原有记录是否保留尚待用户检查 | 不卸载、不清除数据。卸载会删除衣叠沙盒里的数据库、导入副本和贴纸；不会删除照片图库中的原照片。 |
| iOS 27 Scene 生命周期项目配置 | `apps/mobile/app.json` 已设置 `ios.enableSceneSupport: true`；生成的 `ios/` 目录被 Git 忽略。修复版已在模拟器和 iPhone 上构建、安装并启动 | 如需回退，删除 `enableSceneSupport` 属性或设为 `false`，再重新运行 Expo prebuild。回退会恢复旧的无 Scene 生命周期配置，在 iOS 27 SDK 下会再次无法启动；不要为解决本问题回退。 |
| Mac CMake | Homebrew CMake 4.4.4 已安装，本轮用于本地 iOS 构建 | 如确认其他本地项目不依赖，可用 `HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1 brew uninstall cmake` 移除。恢复原先 Python/ripgrep 版本及 Homebrew 依赖版本不是自动回退的一部分。 |
| Apple Development 证书与私钥 | Xcode Personal Team 在 Mac 登录钥匙串中使用 | 目前无需删除。删除私钥会使此 Mac 不能继续用该身份签名，也可能影响其他项目；如将来确定停止开发，再核对 Xcode 是否有其他 app 共用后处理。 |
| `codesign` 钥匙串“始终允许” | 已授权 | 若要撤销：打开“钥匙串访问”→“登录”→“我的证书”，展开 Apple Development 证书，查看其私钥的“显示简介/访问控制”，移除 `codesign` 的持续访问或改为每次询问并保存。不要删除证书/私钥，也不要重置钥匙串。Apple 说明“始终允许”会免去后续授权提示，访问控制可在钥匙串访问中调整：[Apple 钥匙串访问说明](https://support.apple.com/en-gb/guide/mac-help/kychn002/26/mac/26)。 |
| Xcode Apple 账号 | 仍登录 | 不需要为回退测试关闭账号。若未来从 Xcode 移除账号，会影响该 Mac 的签名/下载能力；不会替代移除设备上的 app 或关闭 Developer Mode。 |
| Xcode 本地描述文件 | 自动管理，留在本机 | 由 Xcode 管理即可；不需要手动删除。过期时 Xcode 会重新生成。仓库不保存证书、私钥、Team ID 或描述文件。 |

### 本轮执行边界

- 模拟器和签名 Release 包均输出到 `/private/tmp` 下的临时构建目录，不在 Git 仓库提交证书、描述文件或构建产物。
- 真机只安装/启动了衣叠。没有对 iPhone 执行系统更新、恢复、抹除、开发者模式切换或其他 app 操作。安装前后衣叠数据容器标识不同，数据保留情况待用户确认。
- 本轮没有读取照片、通讯录、消息或其他 app 数据。尚未完成真实照片的贴纸处理验收。

## 2026-10-15 后续本地构建记录

- Xcode 27 对当前源码完成了一次完整的 iOS Simulator Release 编译与链接，使用 `CODE_SIGNING_ALLOWED=NO`，构建产物位于 `/private/tmp/YidieDerivedData`。这次只编译通用模拟器目标，没有启动或安装到实体 iPhone。
- 当前 Mac 已解锁，Xcode Settings 显示 iOS 27.0 Simulator runtime 已安装；但本会话无法发现 Simulator.app，CoreSimulatorService 连接失败，因此没有进行模拟器交互、导入照片或访问设备数据。
- 本轮没有改变 Developer Mode、Apple 账号、签名身份、证书、描述文件或钥匙串授权，也没有连接或操作 iPhone。验证完成后已清理本轮生成的 2 GB 临时 DerivedData、Swift module cache 与类型检查 stub。

## 2026-10-15 后续隔离模拟器验收

- 在独立的 iPhone 18 Pro / iOS 27 Simulator 上运行无签名 Debug 构建，使用 app 内合成场景。可见地检查了多人同日叠图及数量角标、打开十条记录的日期、选择深色 4 px 描边、预览并保存、返回后看到更新后的贴纸，以及空月份和月份箭头。没有授权照片访问，预览服务不连接真实数据库或照片存储。
- 另完成 iOS Simulator Release 全量编译（Xcodebuild 退出码 0，`CODE_SIGNING_ALLOWED=NO`，产物在 `/private/tmp/YidieFinalRelease`）。没有安装到实体 iPhone。
- Device Hub 能够传递点击，但拖动没有触发可观察的月份/照片页变化。因此横向手势仍待在模拟器触摸界面或用户真机验收。此项不改变设备安全状态。
- 所有以上操作未触碰 iPhone、照片图库、Developer Mode、Apple 账号、证书、描述文件或钥匙串。临时构建数据保留在 `/private/tmp`，可在确认不再需要后清理。

## 2026-10-15 模拟器组件恢复与隔离复验

- 用户授权安装 iOS Simulator 组件。Xcode 27 报告 iOS 27.0 runtime 已下载；使用 Xcode 的 `-exportPath` 和 `-importPlatform` 将 runtime 注册到 CoreSimulator。组件位于 Mac 的 CoreSimulator 管理目录，不涉及 iPhone。
- CoreSimulator 服务恢复后，`simctl list runtimes` 能看到 iOS 26.1 与 27.0，并能创建、启动一个干净的 iPhone 17 Pro / iOS 26.1 模拟器。无签名 Release app 在该隔离模拟器安装、启动并截图成功；截图只检查应用界面。
- iOS 27.0 runtime 当前仍无法挂载，启动时报 `Cryptex Mount Preferred`；专用 iPhone 18 Pro / iOS 27 Simulator 未能启动。Xcode 安装路径下也未发现 `Simulator.app`。后续需在 Mac 解锁后从 Xcode Settings > Components 修复/安装 Simulator app 与 runtime，再重试；在成功之前不要把本次 iOS 26.1 检查描述为 iOS 27 验收。
- 为减少临时副本占用，已删除 `/private/tmp/yidie-ios27-platform` 中导出的 7.5 GB runtime bundle；已注册的 Simulator runtime 留在系统 CoreSimulator 目录。无须删除证书、描述文件或钥匙串授权。
- 本轮没有连接或操作实体 iPhone，没有改变 Developer Mode、iOS、照片、签名身份或钥匙串；仅在模拟器安装 app，并在本机注册 iOS 27 runtime。

## 2026-10-15 CoreSimulator 服务故障排查

- 经用户先前授权，通过 Device Hub 的 Restart 重启专用 iPhone 17 Pro / iOS 26.1 QA 模拟器；未选择 Reset Content and Settings。Yidie 仍已安装，Spotlight 启动后显示空的 2026 年 10 月日历，月份箭头往返正常。
- 重启后 `xcrun simctl list devices booted` 仍因 CoreSimulatorService / `simdiskimaged` 断连失败；尝试用 `launchctl kickstart` 重启 system `simdiskimaged` 被 macOS 拒绝，未改变 launchd 配置或服务权限。Device Hub 拖动仍未切换月份，触控手势验收保持未通过。
- 本次仅重启专用空数据模拟器；没有连接实体 iPhone、打开照片库、改 Developer Mode、签名、证书或钥匙串，也没有重置/擦除模拟器内容。
