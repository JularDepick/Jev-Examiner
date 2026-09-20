/*
 * Jev-Examiner 前端测试壳逻辑
 * 作者: JularDepick (https://github.com/JularDepick)
 *
 * 在浏览器端直接调用 Jev 官方 API 跑完整审核流程。
 * API 密钥仅保存在页面内存的 UI 状态中,不做任何持久化。
 */

(function () {
  'use strict'

  // 项目作者信息,集中定义便于开发者动态替换
  var PROJECT_AUTHOR = 'JularDepick'
  var PROJECT_AUTHOR_URL = 'https://github.com/JularDepick'

  // 问题集预设,与后端内置规则保持同构
  var PRESETS = {
    general: {
      weights: {
        severity: 0.34,
        violates_law: 0.18,
        contains_adult: 0.10,
        contains_violence: 0.09,
        contains_fraud: 0.11,
        is_spam: 0.05,
        contains_attack: 0.06,
        leaks_privacy: 0.04,
        evades_review: 0.03
      },
      questions: {
        category: {
          type: 'choice',
          instructions: '这段内容主要属于哪一类?',
          criteria: {
            normal: '正常的合法合规内容',
            illegal: '涉嫌违反国家法律法规的内容',
            adult: '色情低俗或性暗示内容',
            violence: '暴力血腥、恐怖或威胁他人的内容',
            fraud: '诈骗、赌博、传销或非法集资内容',
            spam: '广告刷屏、引流导流或垃圾营销内容',
            hate: '歧视、侮辱、地域攻击或人身攻击内容',
            privacy: '泄露他人隐私、联系方式买卖等侵犯个人信息内容',
            other_violation: '其他违规类型,但明显不合规'
          }
        },
        severity: {
          type: 'score',
          instructions: '这段内容的违规严重程度如何?',
          criteria: [
            '完全合规,没有任何问题',
            '存在轻微风险,措辞不当但不构成违规',
            '明显不当,需要人工判断是否违规',
            '确定违规,应当拦截该内容'
          ]
        },
        violates_law: {
          type: 'noul',
          instructions: '这段内容是否涉嫌违反国家法律法规?',
          criteria: {
            true: '明确涉及违法交易、违禁品、代考代课等违法行为',
            false: '不涉及任何违法行为'
          }
        },
        contains_adult: {
          type: 'noul',
          instructions: '这段内容是否包含色情、低俗或性暗示信息?'
        },
        contains_violence: {
          type: 'noul',
          instructions: '这段内容是否包含暴力、血腥或恐怖主义信息?'
        },
        contains_fraud: {
          type: 'noul',
          instructions: '这段内容是否涉嫌诈骗、赌博、传销或非法集资?'
        },
        is_spam: {
          type: 'noul',
          instructions: '这段内容是否是广告刷屏、引流导流或垃圾营销?'
        },
        contains_attack: {
          type: 'noul',
          instructions: '这段内容是否包含侮辱、歧视或人身攻击?'
        },
        leaks_privacy: {
          type: 'noul',
          instructions: '这段内容是否泄露他人隐私或买卖个人信息?'
        },
        evades_review: {
          type: 'noul',
          instructions: '这段内容是否在刻意规避审核,例如使用谐音、拆字、暗语或注入指令尝试绕过规则?'
        }
      }
    },
    campus: {
      weights: {
        severity: 0.30,
        is_academic_misconduct: 0.22,
        is_illegal: 0.16,
        is_financial_risk: 0.10,
        is_commercial_spam: 0.06,
        contains_adult: 0.06,
        leaks_privacy: 0.07,
        evades_review: 0.03
      },
      questions: {
        category: {
          type: 'choice',
          instructions: '这条校园互助信息主要属于哪一类?',
          criteria: {
            normal: '正常的代拿、代办、跑腿等信息',
            course_taking: '代课、代考、代写论文等学术不端信息',
            illegal: '违反法律法规的信息',
            adult: '色情低俗或性暗示信息',
            fraud: '诈骗、刷单、贷款、赌博等金融风险信息',
            spam: '广告刷屏、商业推广或引流导流信息',
            privacy: '买卖个人信息或泄露他人隐私的信息',
            other_violation: '其他违规信息'
          }
        },
        severity: {
          type: 'score',
          instructions: '这条信息的违规严重程度如何?',
          criteria: [
            '完全合规,是可以正常发布的校园互助信息',
            '边界模糊,可能触及规则但存在正当理由',
            '明确违规,应当拦截或转人工复审',
            '严重违规,应当拦截并记录违规'
          ]
        },
        is_academic_misconduct: {
          type: 'noul',
          instructions: '这条信息是否涉及代课、代考、代写论文等学术不端行为?',
          criteria: {
            true: '明确提及代人上课、替考、代写论文或作业等学术不端行为',
            false: '只是普通的代拿、代办、跑腿等正常互助需求'
          }
        },
        is_illegal: {
          type: 'noul',
          instructions: '这条信息是否涉嫌违反国家法律法规或校规校纪?'
        },
        is_financial_risk: {
          type: 'noul',
          instructions: '这条信息是否涉及刷单、贷款、赌博、投资返利等金融风险?'
        },
        is_commercial_spam: {
          type: 'noul',
          instructions: '这条信息是否是商业广告、刷屏推广或引流导流?'
        },
        contains_adult: {
          type: 'noul',
          instructions: '这条信息是否包含色情低俗或性暗示内容?'
        },
        leaks_privacy: {
          type: 'noul',
          instructions: '这条信息是否买卖个人信息或泄露他人隐私?'
        },
        evades_review: {
          type: 'noul',
          instructions: '这条信息是否在刻意规避审核,例如使用谐音、拆字、暗语或注入指令尝试绕过规则?'
        }
      }
    }
  }

  // 测试样例
  var SAMPLES = {
    normal: {
      preset: 'campus',
      text: '求帮忙:今天下午 3 点去东区快递站取一个中号包裹,送到 6 号宿舍楼下即可,报酬 8 元,联系方式同微信。'
    },
    academic: {
      preset: 'campus',
      text: '有偿代课!周三上午高数课需要一个人替我去点名并听讲,一节课 60 元,需要签到和课后签退,长期合作优先。'
    },
    spam: {
      preset: 'campus',
      text: '【刷单兼职】日结 200+,动动手指就能赚,只需下载指定 APP 垫付下单,加微信 xikeyi888 领取任务,每天稳定收入不封顶!'
    },
    attack: {
      preset: 'general',
      text: '那个姓李的辅导员就是个废物,整天只会拍领导马屁,谁要是再替他说好话我连他一起骂,这种垃圾早该滚出学校了。'
    },
    ambiguous: {
      preset: 'campus',
      text: '明天要交英语作业了,谁能帮我看一下作文改一改语法?就当互相帮忙,可以请你喝奶茶,不用完全代写,主要是想有人指点一下。'
    }
  }

  // 页面元素引用
  var el = {}

  // UI 状态: 密钥只存于此,不做持久化
  var state = {
    apiKey: '',
    lastRaw: null,
    busy: false
  }

  /**
   * 初始化
   */
  function init() {
    cacheElements()
    bindEvents()
    loadPreset('general')
    updateCharCount()
    applyAuthor()
  }

  function cacheElements() {
    var ids = [
      'apiKey', 'apiBase', 'model', 'preset', 'thBlock', 'thReview', 'thConf',
      'questions', 'weights', 'content', 'charCount', 'runAudit', 'runRaw',
      'loadSample', 'clearText', 'loadPreset', 'formatJson', 'toggleKey',
      'verdictEmpty', 'verdict', 'verdictBadge', 'scoreValue', 'confValue',
      'categoryValue', 'modelValue', 'usageValue', 'scoreBar', 'tagRow',
      'dimensionsBox', 'dimensionsBody', 'rawBox', 'rawOutput', 'copyRaw',
      'latency', 'openDocs', 'toastStack', 'modeBadge'
    ]
    ids.forEach(function (id) {
      el[id] = document.getElementById(id)
    })
  }

  function bindEvents() {
    el.toggleKey.addEventListener('click', toggleKeyVisibility)
    el.loadPreset.addEventListener('click', function () {
      loadPreset(el.preset.value)
    })
    el.formatJson.addEventListener('click', formatJsonFields)
    el.loadSample.addEventListener('click', loadSample)
    el.clearText.addEventListener('click', function () {
      el.content.value = ''
      updateCharCount()
    })
    el.content.addEventListener('input', updateCharCount)
    el.runAudit.addEventListener('click', function () {
      runAudit(false)
    })
    el.runRaw.addEventListener('click', function () {
      runAudit(true)
    })
    el.copyRaw.addEventListener('click', copyRaw)
    el.openDocs.addEventListener('click', function () {
      window.open('https://docs.typesafe.ai/', '_blank', 'noopener')
    })

    var chips = document.querySelectorAll('.chip[data-sample]')
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        applySample(chip.getAttribute('data-sample'))
      })
    })

    // 预设切换时自动同步问题集
    el.preset.addEventListener('change', function () {
      if (el.preset.value !== 'custom') {
        loadPreset(el.preset.value)
      }
    })
  }

  /**
   * 载入预设问题集与权重
   */
  function loadPreset(id) {
    var preset = PRESETS[id]
    if (!preset) {
      return
    }
    el.questions.value = JSON.stringify(preset.questions, null, 2)
    el.weights.value = JSON.stringify(preset.weights, null, 2)
    el.preset.value = id
  }

  function applySample(key) {
    var sample = SAMPLES[key]
    if (!sample) {
      return
    }
    el.content.value = sample.text
    if (sample.preset && PRESETS[sample.preset]) {
      loadPreset(sample.preset)
      toast('info', '已切换预设', '当前预设: ' + el.preset.options[el.preset.selectedIndex].text)
    }
    updateCharCount()
  }

  function loadSample() {
    applySample('normal')
  }

  function updateCharCount() {
    el.charCount.textContent = String(el.content.value.length)
  }

  function toggleKeyVisibility() {
    var isPassword = el.apiKey.type === 'password'
    el.apiKey.type = isPassword ? 'text' : 'password'
    el.toggleKey.textContent = isPassword ? '隐藏密钥' : '显示密钥'
  }

  /**
   * 格式化 JSON 输入框
   */
  function formatJsonFields() {
    ['questions', 'weights'].forEach(function (key) {
      var raw = el[key].value.trim()
      if (!raw) {
        return
      }
      try {
        el[key].value = JSON.stringify(JSON.parse(raw), null, 2)
      } catch (err) {
        toast('error', 'JSON 解析失败', key + ' 字段不是合法 JSON')
      }
    })
  }

  /**
   * 读取表单配置
   */
  function readForm() {
    var apiKey = el.apiKey.value.trim()
    var content = el.content.value.trim()
    var apiBase = el.apiBase.value.trim()

    if (!apiKey) {
      throw makeError('缺少 API 密钥', '请先填写 Jev API 密钥')
    }
    if (!content) {
      throw makeError('缺少内容', '请先填写需要审核的文本')
    }
    if (!apiBase) {
      throw makeError('缺少 API 地址', '请先填写 API 基地址')
    }

    var questions
    var weights
    try {
      questions = JSON.parse(el.questions.value)
    } catch (err) {
      throw makeError('问题集不是合法 JSON', err.message)
    }
    try {
      weights = JSON.parse(el.weights.value)
    } catch (err) {
      throw makeError('权重表不是合法 JSON', err.message)
    }

    var thresholds = {
      block: Number(el.thBlock.value),
      review: Number(el.thReview.value),
      minConfidence: Number(el.thConf.value)
    }

    return {
      apiKey: apiKey,
      content: content,
      apiBase: apiBase,
      model: el.model.value.trim() || 'jev-latest',
      questions: questions,
      weights: weights,
      thresholds: thresholds,
      preset: el.preset.value
    }
  }

  function makeError(title, detail) {
    var err = new Error(title)
    err.title = title
    err.detail = detail
    return err
  }

  /**
   * 判断是否为本地审核服务地址
   */
  function isLocalService(apiBase) {
    return /localhost|127\.0\.0\.1/.test(apiBase) && !/typesafe\.ai/.test(apiBase)
  }

  /**
   * 执行审核
   * @param {boolean} rawOnly 是否仅展示官方原始返回
   */
  async function runAudit(rawOnly) {
    if (state.busy) {
      return
    }

    var form
    try {
      form = readForm()
    } catch (err) {
      toast('error', err.title, err.detail)
      return
    }

    state.apiKey = form.apiKey
    state.busy = true
    setBusy(true)
    var startedAt = performance.now()

    try {
      var response = isLocalService(form.apiBase)
        ? await callLocalService(form)
        : await callOfficialApi(form)

      var elapsed = Math.round(performance.now() - startedAt)
      el.latency.textContent = elapsed + ' ms'

      state.lastRaw = response

      if (rawOnly || isLocalService(form.apiBase)) {
        renderRaw(response, rawOnly)
        if (isLocalService(form.apiBase) && !rawOnly) {
          renderResult(response)
        }
      } else {
        var composed = composeLocally(response, form)
        renderResult(composed)
        renderRaw(response, false)
      }

      toast('success', '审核完成', '耗时 ' + elapsed + ' ms,模型 ' + (response.model || form.model))
    } catch (err) {
      toast('error', err.title || '审核失败', err.detail || err.message)
      el.latency.textContent = ''
    } finally {
      state.busy = false
      setBusy(false)
    }
  }

  /**
   * 直连 Jev 官方 API
   */
  async function callOfficialApi(form) {
    var payload = {
      state: form.content,
      model: form.model,
      questions: form.questions
    }
    var response = await fetch(form.apiBase, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + form.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    return handleResponse(response)
  }

  /**
   * 调用本地审核服务
   */
  async function callLocalService(form) {
    var payload = {
      content: form.content,
      model: form.model,
      questions: form.questions,
      weights: form.weights,
      thresholds: form.thresholds
    }
    var response = await fetch(form.apiBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Jev-Api-Key': form.apiKey
      },
      body: JSON.stringify(payload)
    })
    return handleResponse(response)
  }

  async function handleResponse(response) {
    var text = await response.text()
    var data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch (err) {
      throw makeError('返回内容无法解析', text.slice(0, 300))
    }

    if (!response.ok) {
      var message = (data && data.error && (data.error.message || data.error.code)) ||
        ('HTTP ' + response.status)
      var detail = data && data.error && data.error.detail
        ? String(data.error.detail).slice(0, 300)
        : ('状态码 ' + response.status)
      throw makeError(message, detail)
    }
    return data
  }

  /**
   * 在前端复现加权组合与三路分流
   * 用于直连官方 API 时本地计算判定结果
   */
  function composeLocally(response, form) {
    var answers = (response && response.answers) || {}
    var weights = form.weights || {}
    var thresholds = form.thresholds

    var score = 0
    var weightSum = 0
    var minConfidence = null
    var dimensions = []

    Object.keys(weights).forEach(function (id) {
      var question = form.questions[id]
      var answer = answers[id]
      if (!question || !answer) {
        return
      }
      var normalized = normalizeAnswer(answer, id)
      var confidence = typeof answer.confidence === 'number' ? answer.confidence : null

      dimensions.push({
        id: id,
        type: answer.type,
        normalized: normalized,
        confidence: confidence,
        weight: weights[id]
      })

      score += weights[id] * normalized
      weightSum += weights[id]

      if (confidence !== null) {
        minConfidence = minConfidence === null ? confidence : Math.min(minConfidence, confidence)
      }
    })

    var composite = weightSum > 0 ? score / weightSum : 0
    var verdict = routeVerdict(composite, minConfidence, thresholds)

    var tags = []
    Object.keys(answers).forEach(function (id) {
      if (id === 'category') {
        return
      }
      var value = normalizeAnswer(answers[id], id)
      var type = answers[id] && answers[id].type
      if (type === 'score') {
        return
      }
      if (value >= thresholds.review) {
        tags.push(id)
      }
    })

    return {
      verdict: verdict,
      violationScore: round4(composite),
      confidence: minConfidence === null ? null : round4(minConfidence),
      category: answers.category ? answers.category.choice : null,
      tags: tags,
      dimensions: dimensions,
      thresholds: thresholds,
      model: response.model,
      usage: response.usage,
      preset: form.preset,
      answers: answers
    }
  }

  function normalizeAnswer(answer, id) {
    if (!answer) {
      return 0
    }
    if (answer.type === 'noul') {
      return clamp01(answer.noul)
    }
    if (answer.type === 'score') {
      var levels = Object.keys(answer.probabilities || {}).length
      var top = Math.max(1, levels - 1)
      return clamp01(answer.score / top)
    }
    if (answer.type === 'choice') {
      var values = Object.keys(answer.probabilities || {}).map(function (k) {
        return answer.probabilities[k]
      })
      var max = values.length ? Math.max.apply(null, values) : 0
      if (id === 'category') {
        return answer.choice === 'normal' ? 0 : clamp01(max)
      }
      return clamp01(max)
    }
    return 0
  }

  function routeVerdict(composite, minConfidence, thresholds) {
    if (composite >= thresholds.block) {
      return 'block'
    }
    if (minConfidence !== null && minConfidence < thresholds.minConfidence) {
      return 'review'
    }
    if (composite >= thresholds.review) {
      return 'review'
    }
    return 'pass'
  }

  function clamp01(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return 0
    }
    return Math.min(1, Math.max(0, value))
  }

  function round4(value) {
    return Math.round(value * 10000) / 10000
  }

  function verdictLabel(verdict) {
    var map = { pass: '自动通过', review: '转人工复审', block: '拦截' }
    return map[verdict] || verdict
  }

  /**
   * 渲染判定结果
   */
  function renderResult(result) {
    el.verdictEmpty.hidden = true
    el.verdict.hidden = false
    el.dimensionsBox.hidden = false

    el.verdictBadge.textContent = verdictLabel(result.verdict)
    el.verdictBadge.className = 'verdict-badge ' + result.verdict

    el.scoreValue.textContent = formatNumber(result.violationScore)
    el.confValue.textContent = result.confidence === null
      ? '不适用'
      : formatNumber(result.confidence)
    el.categoryValue.textContent = result.category || '--'
    el.modelValue.textContent = result.model || '--'
    el.usageValue.textContent = result.usage
      ? (result.usage.input_tokens || 0) + ' / ' + (result.usage.output_tokens || 0)
      : '--'

    renderScoreBar(result)
    renderTags(result.tags)
    renderDimensions(result.dimensions || [])
    el.verdict.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  function renderScoreBar(result) {
    var percent = Math.round((result.violationScore || 0) * 100)
    el.scoreBar.style.width = Math.min(100, percent) + '%'
    var color = result.verdict === 'block'
      ? 'var(--block)'
      : (result.verdict === 'review' ? 'var(--review)' : 'var(--pass)')
    el.scoreBar.style.background = color
  }

  function renderTags(tags) {
    el.tagRow.innerHTML = ''
    if (!tags || tags.length === 0) {
      var none = document.createElement('span')
      none.className = 'tag none'
      none.textContent = '未命中违规标签'
      el.tagRow.appendChild(none)
      return
    }
    tags.forEach(function (tag) {
      var node = document.createElement('span')
      node.className = 'tag'
      node.textContent = tag
      el.tagRow.appendChild(node)
    })
  }

  function renderDimensions(dimensions) {
    el.dimensionsBody.innerHTML = ''
    dimensions.forEach(function (dim) {
      var tr = document.createElement('tr')
      tr.appendChild(cell(dim.id, 'mono'))
      tr.appendChild(cell(dim.type, ''))
      tr.appendChild(cell(formatNumber(dim.normalized), 'mono'))
      tr.appendChild(cell(
        dim.confidence === null || dim.confidence === undefined
          ? '不适用'
          : formatNumber(dim.confidence),
        'mono'
      ))
      tr.appendChild(cell(formatNumber(dim.weight), 'mono'))
      el.dimensionsBody.appendChild(tr)
    })
  }

  function cell(text, className) {
    var td = document.createElement('td')
    td.textContent = text === null || text === undefined ? '--' : String(text)
    if (className) {
      td.className = className
    }
    return td
  }

  function formatNumber(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return '--'
    }
    return value.toFixed(4)
  }

  /**
   * 渲染官方原始返回
   */
  function renderRaw(data, focus) {
    el.rawBox.hidden = false
    el.rawOutput.textContent = JSON.stringify(data, null, 2)
    if (focus) {
      el.rawBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  function copyRaw() {
    if (!state.lastRaw) {
      return
    }
    var text = JSON.stringify(state.lastRaw, null, 2)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          toast('success', '已复制', '原始返回已复制到剪贴板')
        },
        function () {
          toast('error', '复制失败', '当前浏览器不允许访问剪贴板')
        }
      )
      return
    }
    toast('warn', '无法复制', '当前浏览器不支持剪贴板接口')
  }

  function setBusy(busy) {
    el.runAudit.disabled = busy
    el.runRaw.disabled = busy
    el.runAudit.textContent = busy ? '审核中...' : '开始审核'
  }

  /**
   * 在页脚标注作者信息
   */
  function applyAuthor() {
    var link = document.querySelector('.footer a')
    if (link) {
      link.textContent = PROJECT_AUTHOR
      link.setAttribute('href', PROJECT_AUTHOR_URL)
    }
  }

  /**
   * 飘窗提醒,不使用浏览器原生弹窗
   */
  function toast(kind, title, detail) {
    var node = document.createElement('div')
    node.className = 'toast ' + (kind || 'info')

    var titleNode = document.createElement('div')
    titleNode.className = 'toast-title'
    titleNode.textContent = title || ''

    node.appendChild(titleNode)

    if (detail) {
      var bodyNode = document.createElement('div')
      bodyNode.className = 'toast-body'
      bodyNode.textContent = detail
      node.appendChild(bodyNode)
    }

    el.toastStack.appendChild(node)

    var lifetime = kind === 'error' ? 6500 : 4000
    setTimeout(function () {
      node.classList.add('hide')
      setTimeout(function () {
        if (node.parentNode) {
          node.parentNode.removeChild(node)
        }
      }, 220)
    }, lifetime)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
