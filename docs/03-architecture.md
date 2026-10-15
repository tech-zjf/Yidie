# 技术方案

衣叠采用 Expo / React Native 实现界面，用本地 Expo Module 调用 Apple Vision 与 PhotoKit。SQLite 保存结构化记录，沙盒目录保存图片。安装好的 Release App 将 JS 和素材一并打包，运行不依赖 Metro、业务服务器、付费 API 或用户填写密钥。

基础工程采用 Expo SDK 57 / React Native 0.86 / React 19.2，完整编译要求 Xcode 26.4+ 与 macOS 26.2+；具体依赖写入 lockfile。升级 SDK 时先复核 Xcode 要求。目前尚无真机性能数据，不能将可交互网页原型当作原生能力证明。

## 模块划分

```text
React Native Screens
  calendar / day-sheet / import / editor / export / settings
          ↓ use cases（导入、改日期、设封面、恢复）
Domain
  date-policy / deterministic-layout / task-state
          ↓ interfaces
Data                 Native Expo Module
  SQLite repository    PhotoKit 本地读取与元数据
  sandbox files        Vision 前景实例 mask
  backup archive       Core Image 合成白边与贴纸
```

实际代码按 `apps/mobile/src/{features,domain,data,ui}` 分层，原生能力位于 `apps/mobile/modules/yidie-native`。页面不得直接调用 SQL 或在组件内做日期猜测。抠图、照片读取、文件管理分别暴露接口，避免形成一个包含整个 App 的原生大模块。

| 能力         | 选择                                                           | 边界                                                                     |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 路由与页面   | AppRoot + TypeScript + 原生 Modal                              | 当前只有月历与弹层，更多独立页面出现时再引入 Expo Router，不先搭复杂 Tab |
| 图片显示     | expo-image，使用本地缩略图                                     | 月历不解码原始 48MP 图片                                                 |
| 文件与数据库 | Swift 文件模块、expo-sqlite                                    | 存相对路径，不能持久化安装沙盒的绝对前缀                                 |
| 动效和手势   | RN Animated、PanResponder、横向 FlatList 与原生 Modal          | 目前不额外引入动画/手势依赖；月历轻扫与慢拖有独立阈值策略，仍需触摸设备验收 |
| 照片选择     | PhotoKit 原生权限与本地资产列表                                | 所有缩略图/原图请求禁止网络；不使用会自动下载原图的通用 picker           |
| 抠图         | Apple Vision，Swift Expo Module                                | iOS 17+ 起评估；系统和设备支持检查；不是 JS 抠图库                       |
| 分享         | 系统分享面板、MediaLibrary 保存权限按需请求                    | App 不负责上传用户照片                                                   |
| 备份         | 原生 `.yidie` 文稿包 + manifest.json                           | 不引入 ZIP 依赖、不经 JS 传输图片字节；用户通过 iOS 文件选择器自行保存   |

自定义原生模块不包含在 Expo Go 中，必须用 development build 或本地原生构建。[Expo Modules](https://docs.expo.dev/modules/get-started/)、[Development builds](https://docs.expo.dev/develop/development-builds/introduction/)

## 一张照片的处理链路

1. 获取用户明确选择的资源，提取元数据。先判断原照片是否可在本机读取。对 PhotoKit 请求设置 `isNetworkAccessAllowed=false`，仅在本地存在时继续。
2. 在自有目录原子写入原图并计算内容摘要，校验文件可读；生成最长边 512px 的照片预览及尺寸，供等待/失败界面使用。日期确认后再在事务中写 entry 与 job；若事务失败，先确认没有持久记录拥有该资源，再移除本次新增文件；归属无法确认时保留文件。
3. 纠正 EXIF orientation；按目标分辨率解码，用 Vision 的 `VNGenerateForegroundInstanceMaskRequest` 得到前景实例。验证阶段保留所有前景实例；后续根据真机效果实现主体选择，当前未提供自动主要人物识别。
4. 获取主体 alpha mask，合成人像透明图。主体应包含外套、裙摆、包等，不能仅使用脸部或人像半身裁剪替代全身抠图。
5. 对 alpha 膨胀得到外轮廓，在其下绘制用户选择的描边色，再覆盖原主体；透明底稿单独保存，阴影作为布局效果处理。裁剪时保留足够的描边余量。
6. 保存透明 PNG 与月历缩略图，事务更新 ready。缩略图与大图均携带尺寸和裁剪边界，不在 JS bridge 传大段 base64。

Apple 框架没有按次调用账单，无需自托管推理服务器。具体照片效果、最低硬件支持和内存峰值必须通过真机验证。[Vision API](https://developer.apple.com/documentation/vision/vngenerateforegroundinstancemaskrequest)、[官方前景效果示例](https://developer.apple.com/documentation/vision/applying-visual-effects-to-foreground-subjects)

## 批量队列与性能

首版图片处理并发 1，逐张释放图像缓冲；处理不占用 UI 主线程。SQLite 持久化任务状态、attempt、revision 和 pause_reason；纯 TypeScript 调度器只保存前台意图和界面快照，不把 JS timer 当可靠后台队列。进入后台停止领取新任务，不保证当前任务在系统挂起前完成。冷启动将遗留 running/queued 标记 paused/interrupted，用户确认后恢复。回前台仅自动恢复 background 暂停项；主动暂停、空间不足与重启恢复不会自动继续。

批量准备逐张复制原图、读取日期并检测重复，确认页不提前执行 Vision。提交在一个事务内复查重复、写入全部记录与任务；失败则整批回滚，副本仍归确认页持有。确认成功后由数据库记录持有原图，队列、手动重试、删除共用串行执行器。数据库无法保存处理结果时停止调度并要求重启，避免仍在 running 的条目失去恢复入口。开发单批上限为 10，放大前需要设备证据。

每次处理持有 entry revision；结果提交前核对记录仍存在且 revision 一致。用户删除、修改主体或重新处理时旧结果不可写回。失败保留原图和可理解的 errorCode。

初始实验参数：输入长边 2048px、缩略图长边 256px、贴纸导出长边不超过 2048px；这些参数是内存与效果的起点，需测试发丝和衣摆后调整。月历最多 42 个格、每格最多 3 个缩略图；跨月只预载相邻月。不预先保证固定 FPS 或每张耗时。

## 日期与数据

数据契约见 v1 基线 [schema.sql](../specs/schema.sql)、后续 [文件清理迁移](../specs/migrations/002-file-deletions.sql)、[队列迁移](../specs/migrations/003-processing-queue.sql)、[照片预览迁移](../specs/migrations/004-photo-previews.sql)、[可编辑贴纸迁移](../specs/migrations/005-editable-stickers.sql) 和 [contracts.ts](../specs/contracts.ts)。`record_date` 使用 `YYYY-MM-DD` 字符串，确认后不再按设备时区从 timestamp 重算。保留 `source_datetime`、`source_offset_minutes`、`suggested_timezone`、`date_source`，用于解释与纠正。SQL 检查格式，领域层检查真实日期、闰年和范围。

EXIF 日期含偏移时使用原本日历日期；不含偏移时保留原字面日期。相册 creationDate 只有绝对时间时，用导入时确定的时区生成建议并由用户确认。不要用 `toISOString().slice(0,10)` 处理本地日期，跨午夜会归错天。

`record_date=null` 表示待归档。一张 entry 对应一次用户记录；相同源图允许用户确认后出现在多天，因此 content_hash 不是全库唯一约束。默认防重复在导入用例中完成。同一天的 cover 使用外键及触发器保证归属一致；移动或删除封面后自动回到默认排序首张。

数据库启用 foreign_keys、WAL，迁移有版本。涉及照片移动、封面和日期变更使用串行写入及事务。文件与数据库无法组成单一系统事务，所以采用临时写入、原子改名、事务提交和启动时对账；当前启动对账只处理自有 originals、stickers、previews、cutouts、photo-previews 五个资源目录中规范 UUID 命名的普通图片文件；数据库记录 ID 与精确路径引用均无归属时才登记持久删除任务。目录或归属读取失败时保留文件；未知文件、符号链接、数据库和用户相册不参与回收。备份恢复的 manifest 与阶段标记已在原生模块实现，故障注入和模拟器端到端验收仍待完成。

## 布局、动画和导出

日历和导出共享纯函数 `layoutMonth(month, entries, layoutVersion)`，产出日期、贴纸变换、裁切边界、文字锚点。位置由记录稳定 id 与显式 style 决定，不在 render 中调用随机数。对同日全部可见层应用旋转与偏移后，计算整组 alpha 边界的并集，加上白边和阴影余量；将该组等比收进单格安全区域，再居中。普通月历、六周月历与导出根据各自单格尺寸执行同一规则，确保不同日期的图片不发生碰撞。

月历每格最多 3 层：建议 -11° / -4° / 9°；后两层水平偏移约 ±4pt、垂直上移约 2pt。主体需要按可见 alpha 边界归一化；长裙和半身照都以统一视觉高度适配。有记录的格子直接用贴纸替代日期；同日多张时在叠图右上显示张数小圆标，单张不显示角标；空格数字居中。底部弹层和无障碍名称保留准确日期及总张数。满月只调整主体尺度和层间错位，不重新加回数字。

贴纸样式在本地保存 Vision 生成的透明抠图底稿，Core Image 使用底稿重绘白色、深色或蓝色 0–8px 描边。预览和保存都在设备上运行，不访问网络。编辑保存先写入带样式版本的贴纸与缩略图，再以 SQLite revision 条件提交路径和样式；失败删除暂存版本，成功后清理旧版本。删除记录时目录清单按严格 UUID 文件名清除所有样式版本。旧记录的透明底稿在用户首次点预览时按需从 App 自有照片副本生成。

首版导出采用原生 Core Graphics / Core Image 画布，根据同一布局描述绘制白底、文字和贴纸；RN 使用同一布局坐标，避免截屏包含系统栏或因离屏视图缺图。输出目标 2048px 宽，导出前检查空间，图片不复制原图 EXIF。数字使用随包分发的 Yidie Display 字体，中文使用系统苹方；原生导出使用同一字体文件，字形与 RN 的度量差异必须做截图对比。

## 彻底本地的范围

- 不设置 API 地址、账号、云同步、远程字体、远程图片、分析 SDK 或崩溃上传；关闭生产版 OTA 更新检查，应用更新通过重新安装签名版本。
- SQLite、WAL/SHM、原图和贴纸都位于 App 自有 Application Support 子目录。通过原生 `isExcludedFromBackup` 排除系统备份；创建、恢复和迁移后均重新设置并验证，不能只排除图片而遗漏数据库。
- 不启用 iCloud / CloudKit entitlement。用户在系统相册原本已开启 iCloud 是系统照片来源的独立行为；衣叠不触发云端照片下载，不修改用户系统设置。
- 常规 PHPicker/ImagePicker 可能为了返回资源而访问 iCloud。阶段 2 必须验证；无法保证严格本地读取时，采用 PhotoKit 的有限照片权限 + 只读取本地资源的选择方案。资源 id 不可用时明确提示，不能绕过约束联网取图。
- 导出到系统 Files 后由用户选择去向；选择 iCloud Drive 是用户主动行为。UI 推荐严格本地用户选择“我的 iPhone”。App 不自动上传备份。

[PhotoKit 网络标志](https://developer.apple.com/documentation/photos/phimagerequestoptions/isnetworkaccessallowed)、[备份排除标志](https://developer.apple.com/documentation/foundation/urlresourcevalues/isexcludedfrombackup)

## 备份与恢复

备份扩展名 `.yidie`，是 iOS 可导入/导出的文稿包，包含 `manifest.json`、SQLite 一致性快照和应用拥有的 `originals/`、`stickers/`、`previews/`、`cutouts/`、`photo-previews/`。manifest 包含 formatVersion、schemaVersion、appVersion、exportedAt、条目数、每个文件的相对路径、大小和 SHA-256。文件不压缩，备份空间大致等于该应用库；不备份 SQLite 正在写入的裸文件，也不读取 Apple Photos 中未被用户导入的照片。

创建快照时通过 SQLite backup API 读取一致数据库，并等待当前图片任务完成后再复制文件。文稿包默认不加密；导出到 Files 后由用户选择保存位置。UI 明示包内含原图副本，用户应保存在可信位置。

恢复先复制到排除系统备份的隔离目录。拒绝包结构外文件、路径不合规、符号链接、过多文件、超出容量的资源、摘要不符、数据库完整性或外键错误、缺失图片和不兼容 schema。展示记录数、资源数量与大小后，再让用户确认“替换当前库”。首版不做复杂自动合并。数据库关闭后才切换沙盒目录；原目录保留到新目录通过校验，原子阶段标记使冷启动可以回滚未提交切换或清理已提交旧数据。

## 安装和分发

本地开发需 macOS + 兼容 Xcode，开发签名使用用户自己的 Apple 账号；仓库不携带证书、描述文件、私钥或 Team ID。开发构建需要 Metro 时不符合最终离线验收，验收必须使用包含 JS bundle 的 Release 真机构建。

本地构建无需强制 EAS 云构建或 Expo 云服务。正式分发阶段再选 TestFlight / 其他符合 Apple 要求的签名方式；初期提供源码与清楚的本地构建说明。不要承诺任意下载的 IPA 能在所有 iPhone 上直接安装。
