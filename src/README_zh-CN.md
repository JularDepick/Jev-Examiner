# src 源码结构

本目录为 Jev-Examiner 的功能性源码目录,包含 API 服务与前端测试壳两个交付物。

## 目录结构

```
src/
├── api/                    # API 接口服务(Node.js,无第三方依赖)
│   ├── app.js              # 服务入口: HTTP 服务、静态托管与错误兜底
│   ├── package.json        # 服务元信息与启动脚本
│   └── include/            # 服务内部模块
│       ├── constants.js    # 全局常量与设计细节
│       ├── jevClient.js    # Jev API 客户端封装
│       ├── questionSets.js # 审核问题集与权重定义
│       ├── auditEngine.js  # 审核引擎: 加权组合与三路分流
│       ├── httpUtils.js    # HTTP 响应与请求处理工具
│       └── router.js       # 路由处理
└── pages/                  # 纯 Web 前端静态测试壳
    ├── index.html          # 测试壳页面
    ├── styles.css          # 页面样式
    └── app.js              # 前端逻辑: 直连 Jev 官方 API
```

## 模块职责

| 模块 | 职责 |
|:---:|:---:|
| `api/app.js` | 创建 HTTP 服务,转发请求至路由,可选托管前端静态资源,统一兜底错误响应 |
| `api/include/constants.js` | 集中存放端口、上游地址、模型标识、阈值与长度上限等可调参数 |
| `api/include/jevClient.js` | 封装 System One 端点调用,负责超时控制、限流退避重试与错误归一化 |
| `api/include/questionSets.js` | 定义通用与校园两套原子问题集及各自权重 |
| `api/include/auditEngine.js` | 把答案归一化并加权组合为违规综合分,依据分数与置信度输出三路判定 |
| `api/include/router.js` | 解析路径与方法,分发至各接口处理函数 |
| `api/include/httpUtils.js` | 读写 JSON 请求体、发送响应、跨域头与密钥提取 |
| `pages/app.js` | 前端状态管理、问题集编辑、直连官方 API 与结果渲染 |

## 设计要点

- API 服务仅使用 Node.js 内置模块,无需安装任何第三方依赖
- 前端测试壳为纯静态页面,浏览器直接打开即可运行,亦可通过 API 服务的静态托管访问
- 前端密钥仅保存在页面运行时的 UI 状态中,不做任何持久化
- 审核规则以问题集与权重表的形式外置,可在接口参数或前端界面中直接调整

## 相关文档

- [API 接口文档](../docs/api/audit.md)
