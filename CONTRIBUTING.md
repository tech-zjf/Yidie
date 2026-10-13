# 参与衣叠

项目当前处于设计与原生能力验证阶段。先阅读 PRD 和实施计划，避免引入账号、后端或收费 API。页面使用中文文案，用户数据保留本地。

修改日期、存储和队列时补有价值的边界测试；视觉调整提供前后截图，覆盖稀疏月历、满月、多张同日和窄屏。不要提交个人照片、Apple 签名资料、密钥、构建产物或本地数据库。

PR 说明写清用户可观察到的变化、验证方式和仍未验证的设备边界。原生能力不得仅依据网页原型或模拟器宣称通过。公开仓库：[tech-zjf/Yidie](https://github.com/tech-zjf/Yidie)。

提交前在 `apps/mobile` 运行 `npm run check`，在根目录运行 `python3 scripts/check_packet.py`。模块依赖方向、性能约束与源码参考见 [工程约定](docs/10-engineering.md)，最新未通过的关卡见 [实施记录](docs/09-build-log.md)。
