# 工程结构与维护约定

衣叠按功能组织界面和状态，用纯 TypeScript 保存业务规则，SQLite 与 Swift 分别通过明确接口接入。目标是修改一个功能时能找到相关代码、测试失败能定位原因、性能问题可以测量。不存在对所有 App 都最优的架构；这里优先考虑单人维护、小规模本地数据和原生图片处理。

## 实际参考过的源码

2026-10-13 查看以下官方仓库的目录与具体文件，参考组织方式，未复制它们的业务代码。

| 参考 | 看到的实践 | 衣叠的采用方式 |
| --- | --- | --- |
| [Bluesky 的 features](https://github.com/bluesky-social/social-app/tree/main/src/features)、[原生 modules](https://github.com/bluesky-social/social-app/tree/main/modules)、[ALF token](https://github.com/bluesky-social/social-app/blob/main/src/alf/tokens.ts) | 功能代码聚合、原生扩展独立、统一样式 token | 月历与导入各有组件和控制 hook；Swift 独立模块；统一颜色与字体 |
| [Ignite 的 Text](https://github.com/infinitered/ignite/blob/master/boilerplate/app/components/Text.tsx)、[typography](https://github.com/infinitered/ignite/blob/master/boilerplate/app/theme/typography.ts) | 文字组件统一样式、语义化字体配置、可复用组件 | 使用轻量 Text/Button 与 body/heading/number/month 四种字体用途 |
| [Expo Modules](https://docs.expo.dev/modules/get-started/)、[SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) | 本地模块自动链接、异步数据库、独立事务连接避免异步写交叉 | 原生源代码位于 modules，写入排队，在配置完成的同一连接中更新条目与任务 |

社交 App 的服务器缓存、登录状态、多平台导航不是衣叠当前的需求，因此不整体搬入。当前用 React 的局部状态和一个服务装配点；出现实际跨功能共享需求后，再决定是否需要额外状态库。

## 目录与依赖方向

```text
apps/mobile/
  App.tsx                         # 单行入口
  src/
    AppRoot.tsx                   # 启动、字体与服务准备
    services.ts                   # 唯一装配点：连接数据库、原生能力
    features/
      calendar/                   # 页面、月格、当天弹层、控制 hook
      import/                     # 选照、确认日期、导入控制 hook
    domain/
      datePolicy.ts               # 公历日期、EXIF/相册来源优先级
      stickerLayout.ts            # 稳定旋转、整组适配单格
      importPhoto.ts              # 导入用例与失败时所有权转移
      records.ts                  # 数据类型与存储/处理接口
    data/
      entryRepository.ts          # SQLite、迁移、事务与恢复状态
      writeTransaction.ts         # 专用连接、外键核验、事务与释放
      schema.generated.ts         # 由唯一 SQL 源生成，不手改
    ui/                           # 文字、按钮、文案、设计 token
  modules/yidie-native/
    index.ts                      # 类型化的桥接边界
    ios/
      YidieNativeModule.swift      # Expo 接口适配
      LocalPhotos.swift           # PhotoKit，所有读取禁止网络
      StickerProcessor.swift      # Vision、白边和缩略图
      NativeFileStore.swift       # 自有目录、备份排除、资源 id 校验
```

- `domain` 不依赖 React、Expo、界面、数据库或 Swift；测试不需要模拟器。
- 页面与 hook 不执行 SQL，不直接导入原生模块实例；通过装配后的服务访问。
- `ui` 不包含业务流程。功能内组件优先放在自己的目录，至少两个实际使用场景才提升为共享组件。
- 跨功能调用仅使用该功能的入口组件或用例，不读另一个功能内部的状态。
- 原生模块入口只做类型适配、派发和错误映射。文件、照片和抠图各自独立。
- 不引入通用 BaseRepository、事件总线、全局万能 store、插件系统、过早多包工作区。

ESLint 强制检查领域层和界面层的依赖边界、循环依赖；TypeScript 开启严格模式与未使用项检查；Prettier 固定格式。这些检查不能代替人工评审，但能防止日常开发时明显偏离约定。

## 状态与一致性

数据库是持久记录的事实来源；页面只保存当前月、弹层、选中日期和导入过程状态。文件由原生模块管理，JS 不决定任意目录或删除路径。图片通过本地 URI 传递，不把原图编码为 base64 穿过桥接。

检查 SDK57 的 `SQLiteDatabase.ts` 后确认，`withExclusiveTransactionAsync` 会创建新连接；不能认为原连接的 `foreign_keys=ON` 会继承。衣叠统一使用 `writeTransaction.ts`：新连接 → 开启并核验外键、设置 busy_timeout → BEGIN IMMEDIATE → 执行用例 → COMMIT/ROLLBACK → 关闭连接。SQL 始终传参数，不插值用户输入。这个细节有独立 SQLite 回归检查。

导入先复制原图到自有目录，确认日期后写入记录和任务，再开始 Vision。事务写入失败时清理尚未归属记录的文件；处理失败时保留已归档原图，记录失败状态。当前阶段重启将未完成项标记 paused；完整批量调度、重试、孤儿文件对账属于阶段 3–4，不能宣称已经完成。

同日弹层关闭后，等待 iOS `onDismiss` 再打开照片弹层，避免同时呈现两个原生 Modal。组件卸载后忽略照片预览的异步返回；重复确认有同步锁保护。

## 性能约束与测量

| 路径 | 当前实现 / 后续门槛 |
| --- | --- |
| 原图 | Swift 降采样至长边 2048 后进行 Vision；图片工作在串行队列和 autoreleasepool 中 |
| 月历 | 最多 42 格，每格最多 3 层，使用长边 256 的贴纸缩略图 |
| 相册 | 分页 60 条；FlatList 只渲染窗口内图片，180×240 的本地预览 |
| 记录 | 月历按日期索引只读取当前月；全部记录每页 60 条。阶段 3 增加游标分页和并发变更测试，再做大库验证 |
| 堆叠 | 纯函数计算旋转后的完整包围盒并一次缩放；不逐帧随机位置 |
| 主线程 | 不同步跑抠图，不同步执行数据库批量事务，不解码全量原图给月历 |
| 基准 | 真机测 20 张不同照片的耗时/内存，50 张批量、1000 条月切换与滚动；记录设备与 Release 配置 |

目前没有真实的帧率、耗时或内存峰值结论。`memo` 只用于月格等稳定输入组件；不把遍地 `useMemo` 当作性能保证。确认热点后才做缓存或更换列表库。

## 修改一个功能的顺序

1. 写清输入、输出、异常和归属模块。
2. 先实现纯规则与有价值的边界测试，再接用例和存储。
3. 页面通过控制 hook 触发用例；文案与视觉值进入共享配置。
4. 涉及数据库与文件时说明失败后的所有权、恢复路径和迁移。
5. 运行 `npm run check` 与根目录交付检查，原生改动增加 Swift 检查和完整 iOS 构建。
6. 记录真实验证证据；未完成的设备、离线和性能检查继续保留为门槛。

当前测试覆盖公历、跨时区、跨年、四至六周月历、整组贴纸边界与导入失败路径。后续补存储集成测试、关键交互测试和真机端到端用例，不写只复述实现细节的测试。
