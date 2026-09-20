/**
 * Jev API 客户端
 * 作者: JularDepick (https://github.com/JularDepick)
 *
 * 封装对 Jev 官方 System One 端点的调用,负责请求构造、
 * 超时控制、限流重试与错误归一化。
 */

const CONFIG = require('./constants')

// 遇到这些状态码时按退避策略重试
const RETRYABLE_STATUS = new Set([429, 529, 500, 502, 503, 504])

/**
 * 上游错误对象,统一携带 HTTP 状态码与用户可读信息
 */
class JevError extends Error {
  constructor(message, status, code, detail) {
    super(message)
    this.name = 'JevError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

/**
 * 将毫秒转为可读的等待时间
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 从响应头读取官方建议的重试等待时长
 */
function readRetryAfter(headers) {
  const raw = headers.get('retry-after')
  if (!raw) {
    return null
  }
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }
  const date = Date.parse(raw)
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now())
  }
  return null
}

/**
 * 调用 System One 端点评测 state 与 questions
 * @param {object} options 调用选项
 * @param {string|object|array} options.state 待评测内容
 * @param {object} options.questions 问题集合
 * @param {string} [options.model] 模型标识
 * @param {string} [options.apiKey] 覆盖默认密钥
 * @returns {Promise<object>} 官方原始响应
 */
async function evaluate({ state, questions, model, apiKey }) {
  const key = apiKey || CONFIG.JEV_API_KEY
  if (!key) {
    throw new JevError(
      '缺少 Jev API 密钥,请通过环境变量 JEV_API_KEY 配置或在使用接口时传入 apiKey',
      401,
      'missing_api_key'
    )
  }
  if (state === undefined || state === null || state === '') {
    throw new JevError('state 不能为空', 400, 'empty_state')
  }
  if (!questions || typeof questions !== 'object' || Object.keys(questions).length === 0) {
    throw new JevError('questions 至少需要包含一个问题', 400, 'empty_questions')
  }

  const url = CONFIG.JEV_API_BASE_URL + CONFIG.JEV_API_PATH
  const body = JSON.stringify({
    state,
    model: model || CONFIG.JEV_DEFAULT_MODEL,
    questions
  })

  let lastError = null
  for (let attempt = 0; attempt <= CONFIG.UPSTREAM_MAX_RETRY; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CONFIG.UPSTREAM_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json'
        },
        body,
        signal: controller.signal
      })

      if (response.ok) {
        return await response.json()
      }

      const text = await response.text()
      const status = response.status

      if (RETRYABLE_STATUS.has(status) && attempt < CONFIG.UPSTREAM_MAX_RETRY) {
        const suggested = readRetryAfter(response.headers)
        const backoff = suggested !== null
          ? suggested
          : CONFIG.UPSTREAM_RETRY_BASE_MS * Math.pow(2, attempt)
        await delay(backoff)
        continue
      }

      const codeMap = {
        401: 'unauthorized',
        422: 'invalid_request',
        429: 'rate_limited',
        529: 'overloaded'
      }
      throw new JevError(
        describeStatus(status),
        status,
        codeMap[status] || 'upstream_error',
        text.slice(0, 1000)
      )
    } catch (err) {
      if (err instanceof JevError) {
        throw err
      }
      if (err.name === 'AbortError') {
        lastError = new JevError(
          '上游请求超时',
          504,
          'upstream_timeout'
        )
      } else {
        lastError = new JevError(
          '无法连接 Jev 服务: ' + err.message,
          502,
          'upstream_unreachable'
        )
      }
      if (attempt < CONFIG.UPSTREAM_MAX_RETRY) {
        await delay(CONFIG.UPSTREAM_RETRY_BASE_MS * Math.pow(2, attempt))
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new JevError('上游请求失败', 502, 'upstream_error')
}

/**
 * 查询账号可用的模型列表
 */
async function listModels(apiKey) {
  const key = apiKey || CONFIG.JEV_API_KEY
  if (!key) {
    throw new JevError('缺少 Jev API 密钥', 401, 'missing_api_key')
  }
  const response = await fetch(CONFIG.JEV_API_BASE_URL + CONFIG.JEV_MODELS_PATH, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + key }
  })
  if (!response.ok) {
    throw new JevError(
      describeStatus(response.status),
      response.status,
      'upstream_error',
      (await response.text()).slice(0, 1000)
    )
  }
  return await response.json()
}

/**
 * 将 HTTP 状态码转为用户可读描述
 */
function describeStatus(status) {
  const map = {
    401: 'Jev API 密钥无效或缺失',
    403: 'Jev API 密钥无权访问该资源',
    422: '请求参数未通过 Jev 校验',
    429: '已超出 Jev 速率限制,请稍后重试',
    529: 'Jev 服务暂时过载,请稍后重试'
  }
  return map[status] || ('Jev 服务返回异常状态 ' + status)
}

module.exports = {
  JevError,
  evaluate,
  listModels
}
