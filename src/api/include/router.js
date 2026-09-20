/**
 * 路由处理
 * 作者: JularDepick (https://github.com/JularDepick)
 *
 * 提供无鉴权的通用内容审核接口。密钥由调用方在请求中携带,
 * 或由服务端通过环境变量统一配置;两者择一由 keySource 策略决定。
 */

const CONFIG = require('./constants')
const { auditContent, auditBatch, VERDICT } = require('./auditEngine')
const { PRESETS } = require('./questionSets')
const jevClient = require('./jevClient')
const { sendJson, readJsonBody, extractApiKey, resolveKeySource, isSecureRequest } = require('./httpUtils')

/**
 * 路由表: 路径 -> 处理函数
 */
const ROUTES = {
  'GET /health': handleHealth,
  'GET /presets': handlePresets,
  'POST /audit': handleAudit,
  'POST /audit/batch': handleAuditBatch,
  'POST /models': handleModels,
  'POST /raw': handleRaw
}

/**
 * 按来源策略解析密钥,缺失时写出错误响应并返回 null
 */
function resolveKeyOrFail(req, res, body) {
  const keySource = resolveKeySource(req, body)
  const apiKey = extractApiKey(req, body, keySource)
  if (apiKey) {
    return { apiKey, keySource }
  }
  const fromServer = keySource === 'server'
  sendJson(res, fromServer ? 500 : 401, {
    error: {
      code: fromServer ? 'server_key_missing' : 'missing_api_key',
      message: fromServer
        ? '服务端未配置 Jev API 密钥,请设置环境变量 JEV_API_KEY'
        : '缺少调用方携带的 Jev API 密钥'
    }
  })
  return null
}

/**
 * 解析请求路径与方法,匹配路由
 */
async function dispatch(req, res) {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'))
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const key = req.method + ' ' + path

  const handler = ROUTES[key]
  if (!handler) {
    const allowed = Object.keys(ROUTES)
      .filter((route) => route.endsWith(' ' + path))
      .map((route) => route.split(' ')[0])
    if (allowed.length > 0) {
      return sendJson(res, 405, {
        error: { code: 'method_not_allowed', message: '该路径不支持 ' + req.method + ' 方法' },
        allowed
      })
    }
    return sendJson(res, 404, {
      error: { code: 'not_found', message: '未找到路径 ' + path },
      routes: Object.keys(ROUTES)
    })
  }

  return handler(req, res, url)
}

/**
 * 健康检查与运行信息
 */
function handleHealth(req, res) {
  sendJson(res, 200, {
    status: 'ok',
    project: CONFIG.PROJECT_NAME,
    author: CONFIG.PROJECT_AUTHOR,
    serverKeyConfigured: Boolean(CONFIG.JEV_API_KEY),
    keySource: CONFIG.DEFAULT_KEY_SOURCE,
    requireHttps: CONFIG.REQUIRE_HTTPS,
    secure: isSecureRequest(req),
    defaultModel: CONFIG.JEV_DEFAULT_MODEL,
    upstream: CONFIG.JEV_API_BASE_URL + CONFIG.JEV_API_PATH,
    presets: Object.keys(PRESETS),
    thresholds: CONFIG.DEFAULT_THRESHOLDS
  })
}

/**
 * 列出内置场景预设及其问题集
 */
function handlePresets(req, res) {
  const payload = Object.values(PRESETS).map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    questions: preset.questions,
    weights: preset.weights
  }))
  sendJson(res, 200, { presets: payload })
}

/**
 * 单条内容审核
 * 请求体:
 * {
 *   content: string | object,     必填
 *   preset?: string,              场景预设,默认 general
 *   questions?: object,           自定义问题集,覆盖预设
 *   weights?: object,             自定义权重
 *   thresholds?: object,          自定义阈值
 *   model?: string,               模型标识
 *   apiKey?: string,              调用方自带密钥
 *   keySource?: string,           密钥来源策略 auto | client | server
 *   includeAnswers?: boolean      是否回传官方原始答案
 * }
 */
async function handleAudit(req, res) {
  const body = await readJsonBody(req)
  const content = body.content
  if (content === undefined || content === null || content === '') {
    return sendJson(res, 400, {
      error: { code: 'missing_content', message: '缺少必填字段 content' }
    })
  }

  const key = resolveKeyOrFail(req, res, body)
  if (!key) {
    return
  }
  const result = await auditContent({
    content,
    preset: body.preset,
    questions: body.questions,
    weights: body.weights,
    thresholds: body.thresholds,
    model: body.model,
    apiKey: key.apiKey
  })

  sendJson(res, 200, formatResult(result, body.includeAnswers !== false))
}

/**
 * 批量内容审核
 */
async function handleAuditBatch(req, res) {
  const body = await readJsonBody(req)
  const items = body.items
  if (!Array.isArray(items) || items.length === 0) {
    return sendJson(res, 400, {
      error: { code: 'missing_items', message: '缺少必填字段 items,且必须为非空数组' }
    })
  }

  const key = resolveKeyOrFail(req, res, body)
  if (!key) {
    return
  }
  const results = await auditBatch(items, {
    preset: body.preset,
    questions: body.questions,
    weights: body.weights,
    thresholds: body.thresholds,
    model: body.model,
    apiKey: key.apiKey
  })

  const formatted = results.map((entry) => {
    if (!entry.ok) {
      return { ok: false, error: entry.error }
    }
    return { ok: true, audit: formatResult(entry.result, body.includeAnswers !== false) }
  })

  const summary = formatted.reduce((acc, entry) => {
    if (!entry.ok) {
      acc.failed += 1
      return acc
    }
    acc[entry.audit.verdict] = (acc[entry.audit.verdict] || 0) + 1
    return acc
  }, { pass: 0, review: 0, block: 0, failed: 0 })

  sendJson(res, 200, { total: formatted.length, summary, results: formatted })
}

/**
 * 查询账号可用的 Jev 模型
 */
async function handleModels(req, res) {
  const body = await readJsonBody(req)
  const key = resolveKeyOrFail(req, res, body)
  if (!key) {
    return
  }
  const data = await jevClient.listModels(key.apiKey)
  sendJson(res, 200, data)
}

/**
 * 通用透传调用
 * 直接提交 state 与 questions 给 Jev,不做审核封装
 */
async function handleRaw(req, res) {
  const body = await readJsonBody(req)
  const key = resolveKeyOrFail(req, res, body)
  if (!key) {
    return
  }
  const data = await jevClient.evaluate({
    state: body.state,
    questions: body.questions,
    model: body.model,
    apiKey: key.apiKey
  })
  sendJson(res, 200, data)
}

/**
 * 整理输出结构,默认附带判定说明
 */
function formatResult(result, includeAnswers) {
  const output = {
    verdict: result.verdict,
    verdictLabel: verdictLabel(result.verdict),
    violationScore: result.violationScore,
    confidence: result.confidence,
    category: result.category,
    tags: result.tags,
    dimensions: result.dimensions,
    thresholds: result.thresholds,
    preset: result.preset,
    model: result.model,
    usage: result.usage
  }
  if (includeAnswers) {
    output.answers = result.answers
  }
  return output
}

function verdictLabel(verdict) {
  const map = {
    [VERDICT.PASS]: '自动通过',
    [VERDICT.REVIEW]: '转人工复审',
    [VERDICT.BLOCK]: '拦截'
  }
  return map[verdict] || verdict
}

module.exports = { dispatch, ROUTES }
