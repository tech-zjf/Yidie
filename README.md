# 衣叠 Yidie

把穿过的日子，一张张叠起来。

衣叠是一个拟开发的开源 iOS 穿搭贴纸日历：批量选择照片，确认拍摄日期，在手机上生成贴纸；同一天的多套穿搭自然叠放，点开后横向浏览，最后导出自己的月历。

月历有照片时直接显示贴纸，不叠加日期数字和张数角标；空白格才显示数字，准确日期与总张数在点击后的弹层中展示。

**当前交付：产品定义、竞品研究、可交互 UI、技术设计和实施步骤。尚未创建可运行的 Expo App，也未完成真机抠图验证。** 设计原型中的照片是生成的示例素材，导入、抠图、保存和备份操作为演示。研究日期为 2026-10-13。

## 先看界面

- [交互原型](design/index.html)：11 个设计入口，点击日期可展开，顶部按钮切换各模块。
- [界面总览](design/overview.html)：并排查看主要页面，适合设计评审。
- [月历截图](design/screenshots/calendar.jpg)、[当天展开截图](design/screenshots/day.jpg)。

上述 HTML 可以直接在浏览器中打开，不需要安装依赖或联网。修改 `design/prototype.source.html` 后运行 `python3 scripts/build_preview.py` 重建。预览页面不是 App 的代码基础，正式 UI 使用 React Native 实现。

## 项目决定

| 项目 | 决定 |
| --- | --- |
| 名称 | 衣叠 / Yidie，名称和商标仍需发布前复核 |
| 首个平台 | iOS，Expo + React Native + 小型 Swift 原生模块 |
| 本地能力 | Vision 抠图、SQLite 索引、沙盒图片、手动备份 |
| 服务费用 | 不接收费抠图 API；不设置业务后端、账号或云同步 |
| 核心体验 | 同日多张叠放 → 横向展开 → 选封面 → 导出同版月历 |
| 开源目标 | 可复现的本地 App、易理解的模块、值得展示的交互 |
| 是否值得做 | 值得做一次有明确停止条件的小验证；用户量和 Star 没有保证 |
| 首个技术关口 | 真机离线抠图 + 原始日期读取 + 本地照片可用性 |

## 文档导航

1. [市场调研与差异化](docs/01-research.md)
2. [PRD 与验收标准](docs/02-prd.md)
3. [技术方案](docs/03-architecture.md)
4. [分阶段实施方案](docs/04-implementation.md)
5. [UI 与交互规范](docs/05-ui-spec.md)
6. [命名选择](docs/06-naming.md)
7. [验证清单](docs/07-verification.md)
8. [资料来源](docs/SOURCES.md)

## 下一步从哪里开始

先读实施方案的阶段 1–2：在 `apps/mobile` 创建 Expo 工程，使用开发构建接入本地 Swift 模块，在真机上验证一张照片的完整链路。先确认日期、抠图和离线运行可靠，再扩展月历和批量处理。

```text
Yidie/
  apps/                # 正式 Expo App 的预留位置
  design/              # UI 源稿、可离线打开的原型、示例素材
  docs/                # 调研、PRD、技术与实施文档
  specs/               # 数据库与原生接口设计契约
  scripts/             # 原型构建、文档与数据契约检查
```

本地检查：`python3 scripts/check_packet.py`。这只验证交付包、SQL 约束和原型脚本语法，不代表 iOS App 已通过测试。

代码许可采用 MIT，见 [LICENSE](LICENSE)。示例图片来源单独记录在 [素材说明](design/assets/PROVENANCE.md)。未创建 GitHub 远程仓库、公开发布或上架。
