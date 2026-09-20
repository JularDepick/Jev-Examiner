/**
 * 审核引擎
 * 作者: JularDepick (https://github.com/JularDepick)
 *
 * 职责: 组织原子问题、调用 Jev、把答案组合成综合违规分,
 * 并依据分数与置信度输出三路判定结果。
 */

const { evaluate } = require('./jevClient')
const { PRESETS, DEFAULT_PRESET } = require('./questionSets')
const CONFIG = require('./constants')

// 三路判定结果
const VERDICT = {
  PASS: 'pass',       // 自动通过
  REVIEW: 'review',   // 转人工复审
  BLOCK: 'block'      // 拦截
}

/**
 * 把单个答案归一化为 0-1 的"违规倾向"值
 * - Noul: 本身即"答案为是"的概率
 * - Score: 除以最高层级编号归一化
 * - Choice: 取最大概率,若命中的是正常类则记为 0
 */
function normalizeAnswer(answer, question, weightsKey) {
  if (!answer) {
    return { value: 0, confidence: null }
  }

  if (answer.type === 'noul') {
    return { value: clamp01(answer.noul), confidence: null }
  }

  if (answer.type === 'score') {
    const top = Math.max(1, Object.keys(answer.probabilities || {}).length - 1)
    return { value: clamp01(answer.score / top), confidence: answer.confidence }
  }

  if (answer.type === 'choice') {
    const probabilities = answer.probabilities || {}
    const top = Math.max(0, ...Object.values(probabilities))
    // 命中正常类别时不产生违规分
    if (weightsKey === 'category') {
      const normalKeys = new Set(['normal'])
      return { value: normalKeys.has(answer.choice) ? 0 : clamp01(top), confidence: answer.confidence }
    }
    return { value: clamp01(top), confidence: answer.confidence }
  }

  return { value: 0, confidence: null }
}

/**
 * 依据权重把各维度信号组合为综合违规分
 * 类别维度不参与加权,仅用于输出分类标签
 */
function composeScore(answers, questions, weights) {
  const details = {}
  let score = 0
  let weightSum = 0
  let minConfidence = 1
  let confidenceTracked = false

  for (const [id, weight] of Object.entries(weights)) {
    const question = questions[id]
    if (!question) {
      continue
    }
    const { value, confidence } = normalizeAnswer(answers[id], question, id)
    details[id] = {
      type: question.type,
      normalized: round(value, 4),
      confidence: confidence === null ? null : round(confidence, 4),
      weight
    }
    score += weight * value
    weightSum += weight

    if (confidence !== null) {
      confidenceTracked = true
      minConfidence = Math.min(minConfidence, confidence)
    }
  }

  const composite = weightSum > 0 ? score / weightSum : 0
  return {
    composite: round(composite, 4),
    details,
    minConfidence: confidenceTracked ? round(minConfidence, 4) : null
  }
}

/**
 * 依据综合分与置信度做三路分流
 */
function route(composite, minConfidence, thresholds) {
  if (composite >= thresholds.block) {
    return VERDICT.BLOCK
  }
  if (minConfidence !== null && minConfidence < thresholds.minConfidence) {
    return VERDICT.REVIEW
  }
  if (composite >= thresholds.review) {
    return VERDICT.REVIEW
  }
  return VERDICT.PASS
}

/**
 * 汇总命中的违规标签
 * 阈值: Noul 概率或 Choice 概率超过该值时计入标签
 */
function collectTags(answers, questions, tagThreshold) {
  const tags = []
  for (const [id, answer] of Object.entries(answers || {})) {
    const question = questions[id]
    if (!question) {
      continue
    }
    if (id === 'category') {
      continue
    }
    let value = null
    if (answer.type === 'noul') {
      value = answer.noul
    } else if (answer.type === 'score') {
      const top = Math.max(1, Object.keys(answer.probabilities || {}).length - 1)
      value = answer.score / top
    } else if (answer.type === 'choice') {
      value = Math.max(0, ...Object.values(answer.probabilities || {}))
    }
    if (value !== null && value >= tagThreshold) {
      tags.push(id)
    }
  }
  return tags
}

/**
 * 执行一次内容审核
 * @param {object} options 审核选项
 * @param {string|object} options.content 待审核内容
 * @param {string} [options.preset] 场景预设标识
 * @param {object} [options.questions] 自定义问题集,覆盖预设
 * @param {object} [options.weights] 自定义权重,覆盖预设
 * @param {object} [options.thresholds] 自定义阈值
 * @param {string} [options.model] 模型标识
 * @param {string} [options.apiKey] API 密钥
 * @returns {Promise<object>} 结构化审核结果
 */
async function auditContent(options) {
  const {
    content,
    preset = DEFAULT_PRESET,
    questions: customQuestions,
    weights: customWeights,
    thresholds: customThresholds,
    model,
    apiKey
  } = options

  if (typeof content === 'string' && content.length > CONFIG.MAX_TEXT_LENGTH) {
    const error = new Error('content 长度超出上限 ' + CONFIG.MAX_TEXT_LENGTH + ' 字符')
    error.status = 400
    error.code = 'content_too_long'
    throw error
  }

  const base = PRESETS[preset]
  if (!base && !customQuestions) {
    const error = new Error('未知场景预设 ' + preset)
    error.status = 400
    error.code = 'unknown_preset'
    throw error
  }

  const questions = customQuestions || base.questions
  const weights = customWeights || base.weights || {}
  const thresholds = Object.assign({}, CONFIG.DEFAULT_THRESHOLDS, customThresholds || {})

  const state = typeof content === 'string' ? content : content
  const response = await evaluate({ state, questions, model, apiKey })

  const answers = response.answers || {}
  const composed = composeScore(answers, questions, weights)
  const verdict = route(composed.composite, composed.minConfidence, thresholds)
  const tags = collectTags(answers, questions, thresholds.review)

  return {
    verdict,
    violationScore: composed.composite,
    confidence: composed.minConfidence,
    category: answers.category ? answers.category.choice : null,
    tags,
    dimensions: composed.details,
    thresholds,
    preset: customQuestions ? 'custom' : preset,
    model: response.model,
    usage: response.usage || null,
    answers
  }
}

/**
 * 批量审核,内部并发执行
 */
async function auditBatch(items, options) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('items 必须是非空数组')
    error.status = 400
    error.code = 'invalid_items'
    throw error
  }
  if (items.length > CONFIG.MAX_BATCH_ITEMS) {
    const error = new Error('单次批量上限为 ' + CONFIG.MAX_BATCH_ITEMS + ' 条')
    error.status = 400
    error.code = 'batch_too_large'
    throw error
  }

  const results = await Promise.all(
    items.map((item) => {
      const content = typeof item === 'string' ? item : item.content
      const merged = Object.assign({}, options, { content })
      return auditContent(merged).then(
        (result) => ({ ok: true, result }),
        (err) => ({ ok: false, error: { message: err.message, code: err.code || 'audit_failed' } })
      )
    })
  )
  return results
}

function clamp01(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0
  }
  return Math.min(1, Math.max(0, value))
}

function round(value, digits) {
  const factor = Math.pow(10, digits)
  return Math.round(value * factor) / factor
}

module.exports = {
  VERDICT,
  auditContent,
  auditBatch,
  composeScore,
  route,
  normalizeAnswer
}
