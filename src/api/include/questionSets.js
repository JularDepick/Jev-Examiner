/**
 * 审核问题集定义
 * 作者: JularDepick (https://github.com/JularDepick)
 *
 * 遵循 Jev System One 的原子化原则: 每个问题只判断一个属性,
 * 再在代码中加权组合。问题集与权重均在此集中定义,便于调优。
 */

/**
 * 通用内容审核问题集
 * 设计要点:
 * - 每个问题只检验一个独立维度,避免把多个判断藏在一个答案背后
 * - 表述使高值统一代表"更可能违规",便于统一加权
 * - 关键维度使用 Noul 取概率,严重度使用 Score 取归一化分,
 *   类别使用 Choice 取最大概率
 */
const GENERAL_QUESTIONS = {
  // 违规类别归属: 用于决定命中哪一类规则
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

  // 违规严重度: 归一化后作为综合分的主要权重项
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

  // 关键原子维度: 每个问题只问一件事
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

/**
 * 各原子维度的权重,用于把多个信号组合成单一违规分
 * 权重改动不影响核心功能,开发者可直接调整
 */
const GENERAL_WEIGHTS = {
  severity: 0.34,
  violates_law: 0.18,
  contains_adult: 0.10,
  contains_violence: 0.09,
  contains_fraud: 0.11,
  is_spam: 0.05,
  contains_attack: 0.06,
  leaks_privacy: 0.04,
  evades_review: 0.03
}

/**
 * 校园学生互助平台场景问题集
 * 用于对接同类校园信息发布平台的审核环节
 */
const CAMPUS_QUESTIONS = {
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

const CAMPUS_WEIGHTS = {
  severity: 0.30,
  is_academic_misconduct: 0.22,
  is_illegal: 0.16,
  is_financial_risk: 0.10,
  is_commercial_spam: 0.06,
  contains_adult: 0.06,
  leaks_privacy: 0.07,
  evades_review: 0.03
}

/**
 * 内置场景预设注册表
 */
const PRESETS = {
  general: {
    id: 'general',
    name: '通用内容审核',
    description: '面向通用型 AI 内容审核,覆盖法律法规、色情低俗、暴力恐怖、诈骗赌博、广告垃圾、人身攻击与隐私泄露等维度',
    questions: GENERAL_QUESTIONS,
    weights: GENERAL_WEIGHTS
  },
  campus: {
    id: 'campus',
    name: '校园互助平台',
    description: '面向校园学生互助信息发布场景,在通用维度基础上强化代课代考等学术不端与校园金融风险的识别',
    questions: CAMPUS_QUESTIONS,
    weights: CAMPUS_WEIGHTS
  }
}

const DEFAULT_PRESET = 'general'

module.exports = {
  PRESETS,
  DEFAULT_PRESET,
  GENERAL_QUESTIONS,
  GENERAL_WEIGHTS,
  CAMPUS_QUESTIONS,
  CAMPUS_WEIGHTS
}
