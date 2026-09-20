/**
 * Jev-Examiner API 服务入口
 * 作者: JularDepick (https://github.com/JularDepick)
 *
 * 由 Jev 模型驱动的通用型 AI 内容审核服务。
 * 基于 Node.js 内置 http 模块实现,无第三方依赖。
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const CONFIG = require('./include/constants')
const { dispatch } = require('./include/router')
const { sendJson, sendText, CORS_HEADERS } = require('./include/httpUtils')
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

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now()
  const pathname = new URL(req.url, 'http://' + (req.headers.host || 'localhost')).pathname

  res.on('finish', () => {
    process.stdout.write(
      '[' + new Date().toISOString() + '] ' + req.method + ' ' + req.url +
      ' -> ' + res.statusCode + ' (' + (Date.now() - startedAt) + 'ms)\n'
    )
  })

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
})

server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  const banner = [
    '',
    '  ' + CONFIG.PROJECT_NAME + ' - 由 Jev 驱动的 AI 内容审核服务',
    '  作者: ' + CONFIG.PROJECT_AUTHOR + ' (' + CONFIG.PROJECT_AUTHOR_URL + ')',
    '  监听: http://' + CONFIG.HOST + ':' + CONFIG.PORT,
    '  上游: ' + CONFIG.JEV_API_BASE_URL + CONFIG.JEV_API_PATH,
    '  模型: ' + CONFIG.JEV_DEFAULT_MODEL,
    '  密钥: ' + (CONFIG.JEV_API_KEY ? '已由服务端配置' : '未配置,需调用方携带'),
    '',
    '  接口: GET /health  POST /audit  POST /audit/batch  GET /presets  POST /models  POST /raw',
    ''
  ].join('\n')
  process.stdout.write(banner + '\n')
})
