/**
 * Jev-Examiner API 服务入口
 * 作者: JularDepick (https://github.com/JularDepick)
 *
 * 由 Jev 模型驱动的通用型 AI 内容审核服务。
 * 基于 Node.js 内置 http/https 模块实现,无第三方依赖。
 */

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const CONFIG = require('./include/constants')
const { dispatch } = require('./include/router')
const {
  sendJson,
  sendText,
  CORS_HEADERS,
  isSecureRequest,
  isLoopbackRequest
} = require('./include/httpUtils')
const { JevError } = require('./include/jevClient')

// 静态资源类型映射,用于可选托管前端测试壳
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png'
}

/**
 * 尝试以静态文件响应请求
 * 未命中静态文件时返回 false,交由路由处理
 */
function tryServeStatic(req, res, pathname) {
  if (req.method !== 'GET') {
    return false
  }
  const relative = pathname === '/' ? '/index.html' : pathname
  const target = path.join(CONFIG.WEB_ROOT, relative)
  const resolved = path.resolve(target)

  if (!resolved.startsWith(path.resolve(CONFIG.WEB_ROOT))) {
    return false
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return false
  }

  const ext = path.extname(resolved).toLowerCase()
  const type = MIME_TYPES[ext] || 'application/octet-stream'
  sendText(res, 200, fs.readFileSync(resolved), type)
  return true
}

/**
 * 读取 TLS 证书与私钥
 * 任一未配置或读取失败时返回 null,由调用方回退为 HTTP 并提示
 */
function loadTlsOptions() {
  if (!CONFIG.HTTPS_KEY_PATH || !CONFIG.HTTPS_CERT_PATH) {
    return null
  }
  try {
    return {
      key: fs.readFileSync(CONFIG.HTTPS_KEY_PATH),
      cert: fs.readFileSync(CONFIG.HTTPS_CERT_PATH)
    }
  } catch (err) {
    process.stderr.write('  [警告] HTTPS 证书读取失败,本次以 HTTP 启动: ' + err.message + '\n')
    return null
  }
}

/**
 * 强制加密策略
 * 开启后拒绝一切非加密请求,回环来源同样不放行;
 * 密钥随明文请求传输即视为泄漏,故不以来源是本机为豁免理由
 */
function rejectInsecure(req, res) {
  if (!CONFIG.REQUIRE_HTTPS || isSecureRequest(req)) {
    return false
  }
  const hint = isLoopbackRequest(req)
    ? ',本机来源同样不放行'
    : ';若由反向代理终止 TLS,需转发 X-Forwarded-Proto: https'
  sendJson(res, 403, {
    error: {
      code: 'https_required',
      message: '本服务已强制使用 HTTPS,请改用 https 访问' + hint
    }
  })
  return true
}

/**
 * 请求总入口: 加密检查 -> 预检放行 -> 静态资源 -> 接口路由 -> 错误兜底
 */
async function handleRequest(req, res) {
  const startedAt = Date.now()
  const pathname = new URL(req.url, 'http://' + (req.headers.host || 'localhost')).pathname

  res.on('finish', () => {
    process.stdout.write(
      '[' + new Date().toISOString() + '] ' + req.method + ' ' + req.url +
      ' -> ' + res.statusCode + ' (' + (Date.now() - startedAt) + 'ms)\n'
    )
  })

  if (rejectInsecure(req, res)) {
    return
  }

  // 预检请求直接放行
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    res.end()
    return
  }

  // 接口路径以 /api 前缀优先,便于区分静态资源
  const isApiPath = pathname === '/health' || pathname.startsWith('/audit') ||
    pathname === '/presets' || pathname === '/models' || pathname === '/raw'

  try {
    if (!isApiPath && tryServeStatic(req, res, pathname)) {
      return
    }
    await dispatch(req, res)
  } catch (err) {
    const status = err.status || 500
    if (err instanceof JevError) {
      sendJson(res, status, {
        error: {
          code: err.code,
          message: err.message,
          detail: err.detail || null
        }
      })
      return
    }
    sendJson(res, status, {
      error: {
        code: err.code || 'internal_error',
        message: err.message || '服务内部错误'
      }
    })
  }
}

const tlsOptions = loadTlsOptions()
const protocol = tlsOptions ? 'https' : 'http'
const server = tlsOptions
  ? https.createServer(tlsOptions, handleRequest)
  : http.createServer(handleRequest)

server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  const banner = [
    '',
    '  ' + CONFIG.PROJECT_NAME + ' - 由 Jev 驱动的 AI 内容审核服务',
    '  作者: ' + CONFIG.PROJECT_AUTHOR + ' (' + CONFIG.PROJECT_AUTHOR_URL + ')',
    '  监听: ' + protocol + '://' + CONFIG.HOST + ':' + CONFIG.PORT,
    '  上游: ' + CONFIG.JEV_API_BASE_URL + CONFIG.JEV_API_PATH,
    '  模型: ' + CONFIG.JEV_DEFAULT_MODEL,
    '  密钥: ' + (CONFIG.JEV_API_KEY ? '已由服务端配置' : '未配置,需调用方携带') +
      ' (来源策略 ' + CONFIG.DEFAULT_KEY_SOURCE + ')',
    '  传输: ' + (CONFIG.REQUIRE_HTTPS ? '强制 HTTPS' : '未强制,明文请求放行'),
    '',
    '  接口: GET /health  POST /audit  POST /audit/batch  GET /presets  POST /models  POST /raw',
    ''
  ].join('\n')
  process.stdout.write(banner + '\n')
})
