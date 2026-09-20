/**
 * Jev-Examiner 全局常量与设计细节
 * 作者: JularDepick (https://github.com/JularDepick)
 *
 * 本文件集中存放可个性化修改但不影响核心功能的配置项,
 * 开发者只需修改本文件即可调整服务行为,无需改动业务逻辑。
 */

const path = require('path')

// 项目元信息
const PROJECT_NAME = 'Jev-Examiner'
const PROJECT_AUTHOR = 'JularDepick'
const PROJECT_AUTHOR_URL = 'https://github.com/JularDepick'

// Jev 官方 API 配置
const JEV_API_BASE_URL = process.env.JEV_API_BASE_URL || 'https://api.typesafe.ai'
const JEV_API_PATH = '/v1/systemone'
const JEV_MODELS_PATH = '/v1/models'
// 使用别名可自动跟进官方最新稳定版,响应 model 字段会回传实际版本号
const JEV_DEFAULT_MODEL = process.env.JEV_MODEL || 'jev-latest'

// 服务端持有的 Jev API 密钥,便于部署时不落盘
const JEV_API_KEY = process.env.JEV_API_KEY || process.env.TYPESAFE_API_KEY || ''

// 密钥来源策略:
// auto 为调用方优先并回退服务端,client 为仅用调用方,server 为仅用服务端
const DEFAULT_KEY_SOURCE = process.env.KEY_SOURCE || 'auto'

// 服务监听地址与端口
const HOST = process.env.HOST || 'localhost'
const PORT = Number(process.env.PORT || 8080)

// HTTPS 监听,同时配置证书与私钥路径后启用;生产环境通常由反向代理终止 TLS
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || ''
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || ''

// 强制 HTTPS: 开启后拒绝非 HTTPS 且非回环来源的请求
const REQUIRE_HTTPS = process.env.REQUIRE_HTTPS === 'true'

// 上游请求超时与重试
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 30000)
const UPSTREAM_MAX_RETRY = Number(process.env.UPSTREAM_MAX_RETRY || 2)
const UPSTREAM_RETRY_BASE_MS = Number(process.env.UPSTREAM_RETRY_BASE_MS || 500)

// 文本输入上限,与 Jev 64k 上下文预算保持安全余量
const MAX_TEXT_LENGTH = Number(process.env.MAX_TEXT_LENGTH || 32000)
const MAX_BATCH_ITEMS = Number(process.env.MAX_BATCH_ITEMS || 20)

// 审核判定阈值: 三路分流的默认边界
const DEFAULT_THRESHOLDS = {
  // 违规综合分 >= block 时直接拦截
  block: 0.70,
  // 违规综合分 >= review 时进入人工复审
  review: 0.35,
  // 关键维度置信度低于此值时强制转人工复审
  minConfidence: 0.55
}

// 静态前端目录,供 API 服务可选托管
// __dirname 指向 src/api/include,向上两级到达 src,再进入 pages
const WEB_ROOT = path.resolve(__dirname, '..', '..', 'pages')

module.exports = {
  PROJECT_NAME,
  PROJECT_AUTHOR,
  PROJECT_AUTHOR_URL,
  JEV_API_BASE_URL,
  JEV_API_PATH,
  JEV_MODELS_PATH,
  JEV_DEFAULT_MODEL,
  JEV_API_KEY,
  DEFAULT_KEY_SOURCE,
  HOST,
  PORT,
  HTTPS_KEY_PATH,
  HTTPS_CERT_PATH,
  REQUIRE_HTTPS,
  UPSTREAM_TIMEOUT_MS,
  UPSTREAM_MAX_RETRY,
  UPSTREAM_RETRY_BASE_MS,
  MAX_TEXT_LENGTH,
  MAX_BATCH_ITEMS,
  DEFAULT_THRESHOLDS,
  WEB_ROOT
}
