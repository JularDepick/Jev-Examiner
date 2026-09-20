/**
 * HTTP 响应与请求处理工具
 * 作者: JularDepick (https://github.com/JularDepick)
 */

const CONFIG = require('./constants')

// 跨域允许的来源,开发环境下放开
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Jev-Api-Key',
  'Access-Control-Max-Age': '86400'
}

/**
 * 发送 JSON 响应
 */
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2)
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  }, CORS_HEADERS))
  res.end(body)
}

/**
 * 发送文本响应
 */
function sendText(res, status, text, contentType) {
  const body = Buffer.from(text)
  res.writeHead(status, Object.assign({
    'Content-Type': contentType || 'text/plain; charset=utf-8',
    'Content-Length': body.length
  }, CORS_HEADERS))
  res.end(body)
}

/**
 * 读取并解析请求体
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 5 * 1024 * 1024) {
        reject(Object.assign(new Error('请求体过大'), { status: 413, code: 'payload_too_large' }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(Object.assign(new Error('请求体不是合法 JSON'), { status: 400, code: 'invalid_json' }))
      }
    })
    req.on('error', reject)
  })
}

/**
 * 写入访问日志
 */
function log(req, status, startedAt) {
  const cost = Date.now() - startedAt
  const time = new Date().toISOString()
  process.stdout.write(
    '[' + time + '] ' + req.method + ' ' + req.url + ' -> ' + status + ' (' + cost + 'ms)\n'
  )
}

/**
 * 从请求头读取调用方自带密钥
 * 前端测试壳处于裸链接官方 API 的模式,同样支持经本服务转发
 */
function extractApiKey(req, body) {
  const header = req.headers['x-jev-api-key']
  if (header) {
    return String(header)
  }
  const auth = req.headers['authorization']
  if (auth && /^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '')
  }
  if (body && typeof body.apiKey === 'string' && body.apiKey) {
    return body.apiKey
  }
  return ''
}

module.exports = {
  CORS_HEADERS,
  sendJson,
  sendText,
  readJsonBody,
  log,
  extractApiKey,
  CONFIG
}
