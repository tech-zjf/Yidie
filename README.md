# 衣叠 Yidie

把穿过的日子，一张张叠起来。

衣叠是一个开发中的开源 iOS 穿搭贴纸日历：批量选择照片，确认拍摄日期，在手机上生成贴纸；同一天的多套穿搭自然叠放，点开后横向浏览，最后导出自己的月历。

月历有照片时直接显示贴纸，不叠加日期数字；同日多张会叠放并显示张数角标，空白格保留日期数字。点开后可横向浏览当天记录。

**当前进度：** 核心本地流程与主要 UI 已实现；日历支持左右滑月、同日贴纸堆叠与角标、横向浏览、底部添加居中、弹层过渡、品牌图标和英文界面。贴纸编辑支持本地预览与保存白/深色/蓝色描边及粗细，不需要在线 API；透明抠图底稿与源照片分开保留。最新 iOS Release 已在 iPhone 18 Pro 模拟器构建、安装并启动；该轮只检查了空日历首页，叠图角标和描边编辑界面还需专门交互复核，真实照片边缘效果须由用户在真机验收。单张/整月导出、完整备份/恢复、原生日期选择器尚未实现；卸载可能丢失 App 本地记录，当前仍是开发里程碑，不能视为完整 v0.1。详见[当前全量复审与发布关口](docs/16-readiness-review.md)。

公开仓库：[tech-zjf/Yidie](https://github.com/tech-zjf/Yidie) · [本地构建](apps/mobile/README.md) · [已验证/未验证](docs/09-build-log.md)

## 先看界面

- [交互原型](design/index.html)：11 个设计入口，点击日期可展开，顶部按钮切换各模块。
- [界面总览](design/overview.html)：并排查看主要页面，适合设计评审。
- [RN 开发预览](docs/14-ui-preview.md)：复用 App 组件的固定场景，不读写真实照片；当前真实 App 已在模拟器运行，预览包仍用于固定 UI 场景。
- [月历截图](design/screenshots/calendar.png)、[当天展开截图](design/screenshots/day.png)。

上述 HTML 可以直接在浏览器中打开，不需要安装依赖或联网。修改 `design/prototype.source.html` 后运行 `python3 scripts/build_preview.py` 重建。预览页面不是 App 的代码基础，正式 UI 使用 React Native 实现。

## 项目决定

| 项目         | 决定                                                     |
| ------------ | -------------------------------------------------------- |
| 名称         | 衣叠 / Yidie，名称和商标仍需发布前复核                   |
| 首个平台     | iOS，Expo + React Native + 小型 Swift 原生模块           |
| 本地能力     | Vision 抠图、SQLite 索引、沙盒图片、手动备份             |
| 服务费用     | 不接收费抠图 API；不设置业务后端、账号或云同步           |
| 核心体验     | 同日多张叠放 → 横向展开 → 选封面 → 导出同版月历          |
| 开源目标     | 可复现的本地 App、易理解的模块、值得展示的交互           |
| 是否值得做   | 值得做一次有明确停止条件的小验证；用户量和 Star 没有保证 |
| 首个技术关口 | 真机离线抠图 + 原始日期读取 + 本地照片可用性             |

## 文档导航

1. [市场调研与差异化](docs/01-research.md)
2. [PRD 与验收标准](docs/02-prd.md)
3. [技术方案](docs/03-architecture.md)
4. [分阶段实施方案](docs/04-implementation.md)
5. [UI 与交互规范](docs/05-ui-spec.md)
6. [命名选择](docs/06-naming.md)
7. [验证清单](docs/07-verification.md)
8. [资料来源](docs/SOURCES.md)
9. [落地前全量审查](docs/08-audit.md)
10. [实施与验证记录](docs/09-build-log.md)
11. [模块架构与工程约定](docs/10-engineering.md)
12. [阶段 3 代码复审](docs/11-stage3-review.md)
13. [阶段 4 批量导入复审](docs/12-stage4-review.md)
14. [图片与文件恢复复审](docs/13-image-recovery-review.md)
15. [App UI 预览场景](docs/14-ui-preview.md)
16. [当前全量复审与发布关口](docs/16-readiness-review.md)

## 下一步从哪里开始

先阅读 [本地构建](apps/mobile/README.md)。开发版下一关是先实现不丢数据的本地备份/恢复与图片导出，再由用户在真机上用专门测试照片验收 Vision、边缘观感和离线流程。不要把当前模拟器空日历的启动截图当作真机照片处理证据。

```text
Yidie/
  apps/mobile/         # Expo iOS App 与本地 Swift 模块
  design/              # UI 源稿、可离线打开的原型、示例素材
  docs/                # 调研、PRD、技术与实施文档
  specs/               # 数据库与原生接口设计契约
  scripts/             # 原型构建、文档与数据契约检查
```

根目录检查：`python3 scripts/check_packet.py`；App 检查：进入 `apps/mobile` 执行 `npm ci && npm run check`。完整结果与尚存的上游依赖告警见实施记录。开发验证版暂不用于保存唯一的重要照片。

代码许可采用 MIT，见 [LICENSE](LICENSE)。示例图片来源单独记录在 [素材说明](design/assets/PROVENANCE.md)。尚未上架；源码公开不代表已经通过真机发布验收。
