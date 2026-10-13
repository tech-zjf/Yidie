# App 工程入口

正式工程计划放入 `apps/mobile`。当前未生成 Expo 工程，先按 [实施方案](../docs/04-implementation.md) 完成初始化及真机原生验证。

预计结构：

```text
mobile/
  app/                   Expo Router 页面入口
  src/
    features/            calendar、import、day、editor、export、settings
    domain/              日期规则、布局、队列状态
    data/                repository、文件、备份
    ui/                  token、基础组件
  modules/yidie-native/  Swift 原生模块
  app.config.ts
```

保持应用代码与设计原型独立，避免将 WebView 包装网页原型作为最终 RN App。
