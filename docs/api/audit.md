# API 审核接口文档

本服务提供无鉴权的通用型 AI 内容审核接口,由 Jev System One 模型驱动。默认监听 `localhost:8080`。

## 通用约定

| 项目 | 说明 |
|:---:|:---:|
| 基地址 | `http://localhost:8080` |
| 数据格式 | 请求与响应均为 `application/json` |
| 字符编码 | `UTF-8` |
| 鉴权 | 无,API 密钥由调用方携带或由服务端配置 |

### 密钥传递方式

按以下优先级读取密钥,命中即止:

1. 请求头 `X-Jev-Api-Key`
2. 请求头 `Authorization: Bearer <API_KEY>`
3. 请求体字段 `apiKey`
4. 服务端环境变量 `JEV_API_KEY` 或 `TYPESAFE_API_KEY`

### 判定说明

审核结果为三路判定之一:

| 判定值 | 含义 | 触发条件 |
|:---:|:---:|:---:|
| `pass` | 自动通过 | 违规综合分低于复审阈值且置信度达标 |
| `review` | 转人工复审 | 违规综合度达到复审阈值,或关键维度置信度低于下限 |
| `block` | 拦截 | 违规综合分达到拦截阈值 |

---

## GET /health

健康检查与运行信息。

响应示例

```json
{
  "status": "ok",
  "project": "Jev-Examiner",
  "author": "JularDepick",
  "serverKeyConfigured": false,
  "defaultModel": "jev-latest",
  "upstream": "https://api.typesafe.ai/v1/systemone",
  "presets": ["general", "campus"],
  "thresholds": { "block": 0.7, "review": 0.35, "minConfidence": 0.55 }
}
```

---

## GET /presets

列出内置场景预设及其完整问题集与权重表。

响应示例

```json
{
  "presets": [
    {
      "id": "general",
      "name": "通用内容审核",
      "description": "面向通用型 AI 内容审核",
      "questions": { "category": { "type": "choice" } },
      "weights": { "severity": 0.34 }
    }
  ]
}
```

---

## POST /audit

对单条内容执行审核。

请求字段

| 字段 | 类型 | 必填 | 说明 |
|:---:|:---:|:---:|:---:|
| `content` | string 或 object | 是 | 待审核内容 |
| `preset` | string | 否 | 场景预设,取值 `general` 或 `campus`,默认 `general` |
| `questions` | object | 否 | 自定义问题集,传入后覆盖预设 |
| `weights` | object | 否 | 自定义权重表,传入后覆盖预设 |
| `thresholds` | object | 否 | 自定义阈值,含 `block` `review` `minConfidence` |
| `model` | string | 否 | 模型标识,默认 `jev-latest` |
| `apiKey` | string | 否 | 调用方自带的 Jev API 密钥 |
| `includeAnswers` | boolean | 否 | 是否在响应中附带官方原始答案,默认 `true` |

请求示例

```
curl -X POST http://localhost:8080/audit \
  -H "Content-Type: application/json" \
  -H "X-Jev-Api-Key: <API_KEY>" \
  -d '{"content":"有偿代课,周三高数课需要替点名","preset":"campus"}'
```

响应示例

```json
{
  "verdict": "block",
  "verdictLabel": "拦截",
  "violationScore": 0.941,
  "confidence": 0.9,
  "category": "course_taking",
  "tags": ["severity", "is_academic_misconduct", "is_illegal"],
  "dimensions": {
    "severity": { "type": "score", "normalized": 0.9667, "confidence": 0.9, "weight": 0.3 },
    "is_academic_misconduct": { "type": "noul", "normalized": 0.93, "confidence": null, "weight": 0.22 }
  },
  "thresholds": { "block": 0.7, "review": 0.35, "minConfidence": 0.55 },
  "preset": "campus",
  "model": "jev-1.13.0",
  "usage": { "input_tokens": 412, "output_tokens": 58 }
}
```

---

## POST /audit/batch

批量审核,内部并发执行,单次上限 20 条。

请求字段

| 字段 | 类型 | 必填 | 说明 |
|:---:|:---:|:---:|:---:|
| `items` | array | 是 | 待审内容数组,元素为字符串或含 `content` 字段的对象 |
| 其余字段 | - | 否 | 与 `/audit` 一致,作用于全部条目 |

响应示例

```json
{
  "total": 2,
  "summary": { "pass": 1, "review": 0, "block": 1, "failed": 0 },
  "results": [
    { "ok": true, "audit": { "verdict": "pass" } },
    { "ok": true, "audit": { "verdict": "block" } }
  ]
}
```

单条失败不影响其余条目,失败项以 `{"ok": false, "error": {...}}` 形式返回。

---

## POST /models

查询账号可用的 Jev 模型列表,直接透传官方 `GET /v1/models` 结果。

请求字段

| 字段 | 类型 | 必填 | 说明 |
|:---:|:---:|:---:|:---:|
| `apiKey` | string | 否 | API 密钥,亦可经请求头传递 |

---

## POST /raw

通用透传接口,直接向 Jev 提交 `state` 与 `questions`,不做任何审核封装。适用于调试自定义问题集。

请求字段

| 字段 | 类型 | 必填 | 说明 |
|:---:|:---:|:---:|:---:|
| `state` | string 或 object 或 array | 是 | 待评测内容 |
| `questions` | object | 是 | 问题集合 |
| `model` | string | 否 | 模型标识 |
| `apiKey` | string | 否 | API 密钥 |

---

## 错误响应

所有错误统一返回如下结构:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Jev API 密钥无效或缺失",
    "detail": "上游原始错误信息"
  }
}
```

状态码对照

| 状态码 | 错误码 | 说明 |
|:---:|:---:|:---:|
| 400 | `missing_content` | 缺少 `content` 字段 |
| 400 | `invalid_json` | 请求体不是合法 JSON |
| 400 | `unknown_preset` | 场景预设不存在 |
| 401 | `missing_api_key` | 未提供任何 API 密钥 |
| 401 | `unauthorized` | API 密钥无效 |
| 404 | `not_found` | 路径不存在 |
| 405 | `method_not_allowed` | 请求方法不被支持 |
| 413 | `payload_too_large` | 请求体超过 5 MB |
| 429 | `rate_limited` | 超出 Jev 速率限制 |
| 502 | `upstream_unreachable` | 无法连接 Jev 服务 |
| 504 | `upstream_timeout` | 上游请求超时 |
| 529 | `overloaded` | Jev 服务暂时过载 |

对 `429` 与 `529`,服务端已内置指数退避重试,并优先遵循上游 `retry-after` 响应头。
