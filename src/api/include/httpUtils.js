/**
 * HTTP 响应与请求处理工具
 * 作者: JularDepick (https://github.com/JularDepick)
 */

const CONFIG = require('./constants')

// 跨域允许的来源,开发环境下放开
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Jev-Api-Key, X-Jev-Key-Source',
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

// 合法的密钥来源策略
const KEY_SOURCES = new Set(['auto', 'client', 'server'])

/**
 * 解析密钥来源策略
 * 调用方可经请求体 keySource 字段或同名请求头指定,未指定时取服务端默认值
 */
function resolveKeySource(req, body) {
  const fromBody = body && typeof body.keySource === 'string' ? body.keySource : ''
  const fromHeader = req.headers['x-jev-key-source'] || ''
  const value = String(fromBody || fromHeader).toLowerCase()
  if (KEY_SOURCES.has(value)) {
    return value
  }
  return CONFIG.DEFAULT_KEY_SOURCE
}

/**
 * 读取调用方随请求携带的密钥
 */
function readClientKey(req, body) {
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

/**
 * 按来源策略取出密钥
 * auto 为调用方优先并回退服务端,client 为仅用调用方,server 为仅用服务端
 */
function extractApiKey(req, body, source) {
  const policy = source || resolveKeySource(req, body)
  if (policy === 'server') {
    return CONFIG.JEV_API_KEY
  }
  const clientKey = readClientKey(req, body)
  if (policy === 'client') {
    return clientKey
  }
  return clientKey || CONFIG.JEV_API_KEY
}

/**
 * 判断请求是否经加密通道到达
 * 由反向代理终止 TLS 时,依赖 X-Forwarded-Proto 判断
 */
function isSecureRequest(req) {
  if (req.socket && req.socket.encrypted) {
    return true
  }
  const proto = req.headers['x-forwarded-proto']
  if (proto) {
    return String(proto).split(',')[0].trim().toLowerCase() === 'https'
  }
  return false
}

/**
 * 判断请求是否来自本机回环地址
 * 回环流量不经过网卡,明文传输不会离开本机
 */
function isLoopbackRequest(req) {
  const address = (req.socket && req.socket.remoteAddress) || ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

module.exports = {
  CORS_HEADERS,
  sendJson,
  sendText,
  readJsonBody,
  log,
  resolveKeySource,
  readClientKey,
  extractApiKey,
  isSecureRequest,
  isLoopbackRequest,
  CONFIG
}
