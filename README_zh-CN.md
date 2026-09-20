<div align="center">

# Jev-Examiner (Jev-审核员)

[![Version](https://img.shields.io/badge/Version-0.1.0-green)](https://github.com/JularDepick/Jev-Examiner/tree/v0.1.0)
[![Copyright](https://img.shields.io/badge/Copyright-JularDepick-0066AA)](./COPYRIGHT)
[![License](https://img.shields.io/badge/License-Apache--2.0-yellow)](./LICENSE)

[English](./README.md) |
[简体中文]

</div>

由 [TypeSafe/Jev模型](https://typesafe.ai) 驱动的通用型 AI 内容审核工作流。

Jev 是 TypeSafe 发布的首个 System One 模型,不做文本生成,而是对一组带类型的问题直接给出结构化答案与概率分布。本项目基于这一特性构建分层审核流程:把宽泛的「是否违规」判断拆解为多个原子问题并行评测,再由代码加权组合,并依据置信度做三路分流。

---

## 功能特性

| 功能 | 说明 |
|:---:|:---:|
| 分层原子审核 | 把审核判断拆解为违规类别、严重度与各独立违规维度,在一次请求中并行评测 |
| 加权综合评分 | 各维度归一化为 0 到 1 的违规倾向后按权重组合,权重可调 |
| 置信度三路分流 | 结合违规综合分与模型置信度,输出自动通过、转人工复审或拦截 |
| 场景预设 | 内置通用内容审核与校园互助平台两套问题集,开箱即用 |
| 自定义问题集 | 调用方可传入自定义问题集与权重表,完全覆盖预设 |
| 批量审核 | 单次提交多条内容并发审核,返回判定汇总与逐条结果 |
| 无鉴权接口 | API 服务默认不校验调用方身份,密钥由调用方携带或服务端统一配置 |
| 官方 API 直连 | 前端测试壳可携带密钥直连 Jev 官方端点,脱离后端独立验证 |
| 可视化测试壳 | 内置纯静态测试页,支持编辑问题集、切换预设、查看维度明细与原始返回 |

## 快速开始

### 环境要求

- Node.js 20 及以上(服务端使用内置 `fetch`)

### 启动 API 服务

```
cd src/api
npm start
```

服务默认监听 `http://localhost:8080`。API 服务仅使用 Node.js 内置模块,无需安装任何第三方依赖。

如需服务端统一配置密钥,可在启动前设置环境变量:

```
JEV_API_KEY=<你的密钥> npm start
```

### 使用前端测试壳

前端为纯静态页面,浏览器直接打开 `src/pages/index.html` 即可;也可在 API 服务启动后访问 `http://localhost:8080/` 加载同一页面。

在页面中填写 Jev API 密钥与待审内容,点击「开始审核」即可看到判定结果、维度明细与官方原始返回。密钥仅保存在页面运行时的 UI 状态中,不做任何持久化。

前端默认直连 Jev 官方端点。官方端点仅放行白名单来源,浏览器以本地方式打开页面时会因跨域策略被拦截,此时有两种方式:将 API 基地址改为本地服务 `http://localhost:8080/audit` 经其转发;或以禁用跨域检查的方式启动浏览器。改为本地服务后,页面无需与 API 服务同源即可调用。

### 调用审核接口

```
curl -X POST http://localhost:8080/audit \
  -H "Content-Type: application/json" \
  -H "X-Jev-Api-Key: <你的密钥>" \
  -d '{"content":"待审核的文本内容","preset":"general"}'
```

## 目录结构

```
Jev-Examiner/
├── .github/                        # GitHub工作流
│   └── workflows/                  # 工作流配置
│       └── deploy-src-pages-as-pages.yml # 部署src/pages到Pages
├── .gitignore                      # git忽略规则
├── COPYRIGHT                       # 版权文件
├── LICENSE                         # 许可证文件
├── README.md                       # README文档(英文版)
├── README_zh-CN.md                 # README文档(简体中文版)
├── docs/                           # 项目文档
│   └── api/                        # 接口文档
│       └── audit.md                # 审核接口文档
└── src/                            # 项目源码
    ├── README_zh-CN.md             # 源码结构说明
    ├── api/                        # API接口服务(Node.js)
    │   ├── app.js                  # 服务入口
    │   ├── package.json            # 服务元信息
    │   └── include/                # 服务内部模块
    │       ├── constants.js        # 全局常量与设计细节
    │       ├── jevClient.js        # Jev API 客户端封装
    │       ├── questionSets.js     # 审核问题集与权重定义
    │       ├── auditEngine.js      # 审核引擎
    │       ├── httpUtils.js        # HTTP 处理工具
    │       └── router.js           # 路由处理
    └── pages/                      # 纯Web前端静态测试壳
        ├── index.html              # 测试壳页面
        ├── styles.css              # 页面样式
        └── app.js                  # 前端逻辑
```

## 文档

- [接口文档](docs/api/audit.md)
- [Jev 官方开发文档](https://docs.typesafe.ai/)

## 版权信息

Copyright &copy; 2026 JularDepick

详见 [COPYRIGHT](./COPYRIGHT) 。

## 许可证

本仓库采用 [Apache-2.0许可证](./LICENSE) 。

## 贡献指南

详见 [CONTRIBUTING.md](./CONTRIBUTING.md) 。
