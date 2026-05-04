/**
 * 生成扩展种子事件 (200+ events)
 */
import fs from 'fs'
import path from 'path'

const events = []
let id = 0

// Helpers
function eid(prefix) { return `seed_${prefix}_${String(++id).padStart(3, '0')}` }

function mkEvent({ id, title, body, type, family, tone = 'warn', weight = 3, cooldownDays = 3, trigger = {}, options }) {
  return { id, title, body, type, family, tone, phase: 'afterAction', weight, cooldownDays, trigger, options }
}

function stdOptions() {
  return [
    { id: 'option_a', label: '默默承受（疲劳+5，专注-3）', tone: 'primary', effects: [
      { kind: 'stat', target: 'fatigue', delta: 5 },
      { kind: 'stat', target: 'focus', delta: -3 },
      { kind: 'log', title: '承受', detail: '你选择了忍耐。', tone: 'info' }
    ]},
    { id: 'option_b', label: '想办法应对（道心+0.2，疲劳+3）', tone: 'danger', effects: [
      { kind: 'stat', target: 'daoXin', delta: 0.2 },
      { kind: 'stat', target: 'fatigue', delta: 3 },
      { kind: 'log', title: '应对', detail: '你开始寻找解决办法。', tone: 'warn' }
    ]},
    { id: 'option_c', label: '暂时逃避（专注-5）', effects: [
      { kind: 'stat', target: 'focus', delta: -5 },
      { kind: 'log', title: '逃避', detail: '你选择暂时不去想它。', tone: 'info' }
    ]}
  ]
}

// ============ 催收压迫类 (35) ============
const collectionData = [
  ['温柔陷阱', '「同学，只是善意提醒哦。」短信末尾的笑脸表情让你更加不安。系统知道什么语气最让你难受。', { minDelinquency: 0, maxDelinquency: 1, financialRiskIn: ['low', 'medium'] }],
  ['同窗压力', '班长在群里发了条消息：「本月还款率未达标的同学，月考成绩将受影响。」你感到脊背发凉。', { minDelinquency: 1, maxDelinquency: 2, financialRiskIn: ['medium', 'high'] }],
  ['制度威慑', '教务处发来通知：「逾期还款将影响下学期分班评估。」制度的大棒总是悬在你头顶。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['深夜来电', '凌晨两点，电话铃声撕裂寂静。「你的债务已经进入最后催收阶段。」对方的声音冷得像冰。', { minDelinquency: 3, financialRiskIn: ['extreme'] }],
  ['最后通牒', '「今日 18:00 前未还款，将启动社会评价下调程序。」倒计时在屏幕上跳动。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['邻居目光', '催收员站在宿舍门口，声音不大但足够让整层楼听见。邻居们的目光像针一样扎在你身上。', { minDelinquency: 3, financialRiskIn: ['high', 'extreme'] }],
  ['社交曝光', '「如果你再不还款，我们会在你的社交主页上发布欠款公告。」你握紧手机，指节发白。', { minDelinquency: 2, financialRiskIn: ['medium', 'high'] }],
  ['情感绑架', '「想想你父母供你修仙多不容易，你这样对得起他们吗？」催收员的语气突然变得语重心长。', { minDelinquency: 1, financialRiskIn: ['medium'] }],
  ['自动化轰炸', '你的手机开始疯狂震动——短信、电话、推送通知轮番轰炸。AI 催收系统比任何人类都更执着。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['信用标记', '学院公告栏上出现了一个二维码，扫码后赫然显示着逾期学生名单。你的名字就在其中。', { minDelinquency: 3, financialRiskIn: ['extreme'] }],
  ['利滚利', '「其实你现在还一点，剩下的可以分期嘛。」你签下的新协议让总债务悄然增加了 30%。', { minDelinquency: 1, financialRiskIn: ['medium', 'high'] }],
  ['沉默施压', '连续三天没有任何催收消息。你反而更加焦虑——不知道对方在策划什么。', { minDelinquency: 1, financialRiskIn: ['low', 'medium'] }],
  ['实习资格', '「逾期学生的实习推荐信将暂缓发放。」没有实习，你的修仙履历将毫无竞争力。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['以贷养贷', '催收员推荐了「合作平台」的贷款产品，利息更低——但只是从明面转到了暗处。', { minDelinquency: 1, financialRiskIn: ['medium'] }],
  ['家庭联络', '你收到了母亲的消息：「学校说你的贷款出了点问题，怎么回事？」他们还是联系了家人。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['节日问候', '「中秋节快乐！温馨提醒：您的欠款已逾期 15 天。」节日祝福与催收通知无缝结合。', { minDelinquency: 1, financialRiskIn: ['low', 'medium'] }],
  ['同伴施压', '辅导员在班会上说：「我们班还款率全院最低。」所有人的目光不自觉地飘向你。', { minDelinquency: 1, financialRiskIn: ['medium', 'high'] }],
  ['行为分析', '你发现催收短信总是在你最脆弱的时候发来——深夜、考试前、修炼失败后。AI 太了解你了。', { minDelinquency: 1, financialRiskIn: ['medium'] }],
  ['毕业清算', '「毕业前未结清的债务将按日息 0.5% 计收违约金。」你算了一下，那是个天文数字。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['减免诱惑', '「今天还款可以享受 10% 减免哦。」但你心里清楚，减免的只是冰山一角。', { minDelinquency: 1, financialRiskIn: ['low', 'medium'] }],
  ['公开通报', '学院官网发布了一份「信用优秀学生」名单——没有你的名字。你知道这意味着什么。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['延期陷阱', '「可以申请延期三个月。」你签了字，后来才发现延期期间的利息是平时的两倍。', { minDelinquency: 1, financialRiskIn: ['medium'] }],
  ['希望破灭', '你以为已经还清了，但系统显示还有「服务费」和「管理费」没交。债务像 Hydra 一样越砍越多。', { minDelinquency: 1, financialRiskIn: ['medium', 'high'] }],
  ['倒计时', '「距离采取进一步措施还有 24 小时。」屏幕上的倒计时让你无法集中精神修炼。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['灵力限制', '「逾期未还款学生的修炼资源配给将下调 20%。」没有灵气供给，你的修为将停滞不前。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['人情催收', '一个「学长」主动联系你，说可以帮忙协商——条件是帮他完成一些「小任务」。', { minDelinquency: 1, financialRiskIn: ['medium'] }],
  ['法律威胁', '「你的行为已涉嫌合同欺诈，我们将保留追究法律责任的权利。」你不确定这是不是吓唬人。', { minDelinquency: 3, financialRiskIn: ['extreme'] }],
  ['虚假宽限', '「经申请，您的还款期限已延长至本月 30 日。」但你根本没申请过——这是自动生成的。', { minDelinquency: 1, financialRiskIn: ['medium'] }],
  ['孤立无援', '你试着向朋友求助，但他们也收到了「与欠款人保持距离将影响信用评估」的通知。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['精准打击', '催收系统知道你什么时候最脆弱——修炼瓶颈期、考试周、甚至是你的生日。', { minDelinquency: 1, financialRiskIn: ['medium'] }],
  ['档案记录', '「逾期记录将存入个人修仙档案，影响未来就业。」档案——修仙界最可怕的东西。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['以物抵债', '「可以用修炼资源或法宝抵债。」你交出了唯一的传家宝，但估价只有市价的一半。', { minDelinquency: 1, financialRiskIn: ['medium', 'high'] }],
  ['限制出行', '你的通行令牌被限制了——无法离开学院区域。「还清欠款后自动解除。」系统冷冰冰地提示。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['温水煮青蛙', '每天只催收一点点，让你觉得「好像也没那么严重」。直到某天你发现债务已经翻了三倍。', { minDelinquency: 1, financialRiskIn: ['low', 'medium'] }],
  ['强制执行', '你收到了一份「强制执行通知书」——灵力账户将被冻结，直到债务结清。', { minDelinquency: 3, financialRiskIn: ['extreme'] }],
]

collectionData.forEach(([title, body, trigger]) => {
  events.push(mkEvent({
    id: eid('collection'), title: `催收：${title}`, body, type: 'collection',
    family: '催收', tone: title.includes('陷阱') || title.includes('诱惑') ? 'warn' : 'danger',
    weight: 4 + Math.floor(Math.random() * 3), cooldownDays: 3 + Math.floor(Math.random() * 3),
    trigger, options: stdOptions()
  }))
})

// ============ 打工诱惑类 (35) ============
const workData = [
  ['夜班配送', '「灵骑配送」招募夜班骑手，日结 300 灵石。但需要在深夜穿梭于危险的修仙街区。', { minCash: 0, maxCash: 500, financialRiskIn: ['medium', 'high', 'extreme'] }],
  ['试药志愿者', '丹鼎堂招募试药志愿者，报酬丰厚，但副作用未知。「修行路上，总得有人先试。」', { minCash: 0, maxCash: 800, financialRiskIn: ['high', 'extreme'] }],
  ['代练修仙', '有人在暗网发布代练任务——帮人刷修为、打材料。报酬可观，但被发现会被开除。', { minCash: 0, maxCash: 600, financialRiskIn: ['medium', 'high'] }],
  ['黑中介', '「中介费只要 200 灵石，包你找到高薪零工。」你交了钱，对方却再也没出现过。', { minCash: 100, maxCash: 1000, financialRiskIn: ['medium', 'high'] }],
  ['灵田收割', '城外灵田急招收割工，日结 200 灵石。但来回要耗费 3 个时辰，体力消耗极大。', { minCash: 0, maxCash: 400, financialRiskIn: ['medium'] }],
  ['炼丹学徒', '炼丹房招募助手，可以学到基础丹方，但工作时间长，还可能被丹毒侵蚀。', { minCash: 0, maxCash: 500, financialRiskIn: ['medium', 'high'] }],
  ['擂台陪练', '武馆招募擂台陪练，挨打就能赚钱。你摸了摸自己已经青一块紫一块的身体。', { minCash: 0, maxCash: 600, financialRiskIn: ['high', 'extreme'] }],
  ['押金骗局', '「先交 500 灵石押金，做满一个月退还。」你做了 29 天被辞退，押金自然也没了。', { minCash: 300, maxCash: 1500, financialRiskIn: ['medium'] }],
  ['灵宠寄养', '帮人照顾灵宠，日结 150 灵石。但那只二阶妖兽看起来不太友善。', { minCash: 0, maxCash: 400, financialRiskIn: ['low', 'medium'] }],
  ['抄写经文', '藏经阁招募经文抄写员，报酬不高但环境安静。你犹豫了——这算打工还是修行？', { minCash: 0, maxCash: 300, financialRiskIn: ['low', 'medium'] }],
  ['矿洞采集', '学院后山矿洞招募采集工，日结 250 灵石。但矿洞里时有塌方事故。', { minCash: 0, maxCash: 500, financialRiskIn: ['medium', 'high'] }],
  ['传销拉人', '「加入我们，拉一个人头提成 100 灵石。」你看着那张越来越熟悉的金字塔结构图，心里发毛。', { minCash: 0, maxCash: 800, financialRiskIn: ['high'] }],
  ['替考枪手', '有人出高价请你代考基础法术测试。报酬是 2000 灵石——但被抓到直接开除。', { minCash: 0, maxCash: 500, financialRiskIn: ['high', 'extreme'] }],
  ['药园除草', '灵药园招募除草工，日结 180 灵石。但那些灵草的汁液会让皮肤过敏。', { minCash: 0, maxCash: 400, financialRiskIn: ['low', 'medium'] }],
  ['阵法维护', '学院护城大阵需要定期维护，招募临时阵法师。报酬 400 灵石/天，但需要筑基以上。', { minCash: 0, maxCash: 600, financialRiskIn: ['medium'] }],
  ['劳务合同', '你签了一份「灵活就业合同」，后来才发现里面藏着「自愿放弃社保」的条款。', { minCash: 200, maxCash: 1000, financialRiskIn: ['medium', 'high'] }],
  ['灵兽训练', '驯兽场招募临时驯兽师，日结 350 灵石。但上一任驯兽师被灵兽咬断了手指。', { minCash: 0, maxCash: 600, financialRiskIn: ['medium', 'high'] }],
  ['材料分拣', '丹堂招募分拣工，按件计费。你分拣了 1000 株灵草，手指磨出了血泡，赚了 120 灵石。', { minCash: 0, maxCash: 300, financialRiskIn: ['low', 'medium'] }],
  ['外卖代送', '灵膳堂招募外卖配送员，每单 8 灵石。高峰期一天能跑 50 单，但差评扣钱。', { minCash: 0, maxCash: 400, financialRiskIn: ['medium'] }],
  ['克扣工资', '你做满了一个月，老板却说「考核不合格」，只发了 60% 的工资。你想起劳动法——修仙界没有这个。', { minCash: 200, maxCash: 1000, financialRiskIn: ['medium', 'high'] }],
  ['洞府装修', '有修士招募装修工，帮忙改造洞府。日结 280 灵石，但要在高浓度灵气环境中工作。', { minCash: 0, maxCash: 500, financialRiskIn: ['medium'] }],
  ['替人修炼', '「帮我挂机修炼一天，500 灵石。」你接过对方的账号——这种灰色地带的交易越来越普遍。', { minCash: 0, maxCash: 600, financialRiskIn: ['high'] }],
  ['秘境向导', '有新人修士出钱请你做秘境向导，日结 600 灵石。但那个秘境你已经三年没去过了。', { minCash: 0, maxCash: 500, financialRiskIn: ['medium'] }],
  ['培训费骗局', '「先交 300 培训费，学完包分配工作。」你交了钱，学了一堆没用的东西，工作还是没着落。', { minCash: 200, maxCash: 800, financialRiskIn: ['medium'] }],
  ['法器维修', '炼器坊招募临时维修工，修复损坏的低阶法器。日结 220 灵石，需要基础炼器知识。', { minCash: 0, maxCash: 400, financialRiskIn: ['low', 'medium'] }],
  ['灵脉巡逻', '灵脉守护队招募夜间巡逻员，日结 300 灵石。但灵脉附近时有妖兽出没。', { minCash: 0, maxCash: 500, financialRiskIn: ['medium', 'high'] }],
  ['占卜助理', '天机阁招募占卜助理，帮忙记录卦象。日结 200 灵石，还能偷学一些占卜技巧。', { minCash: 0, maxCash: 400, financialRiskIn: ['low', 'medium'] }],
  ['无限加班', '「做完这批就可以下班了。」你已经连续工作了 16 个时辰，但那批活似乎永远做不完。', { minCash: 100, maxCash: 600, financialRiskIn: ['medium', 'high'] }],
  ['灵茶品鉴', '茶庄招募灵茶品鉴师，日结 250 灵石。但你喝到第七杯时已经开始心悸了。', { minCash: 0, maxCash: 400, financialRiskIn: ['medium'] }],
  ['藏经阁整理', '藏经阁招募图书管理员，日结 150 灵石。工作环境清幽，还能免费翻阅典籍。', { minCash: 0, maxCash: 300, financialRiskIn: ['low'] }],
  ['灵兽清洁', '驯兽场招募清洁工，清理灵兽粪便。日结 200 灵石——但那个味道让你三天吃不下饭。', { minCash: 0, maxCash: 400, financialRiskIn: ['medium'] }],
  ['阴阳合同', '你签了两份合同——一份给学院看的「实习协议」，一份真正的「劳务合同」。后者的条款让你不寒而栗。', { minCash: 300, maxCash: 1200, financialRiskIn: ['medium', 'high'] }],
  ['灵泉引水', '后山灵泉需要人工引水灌溉，日结 180 灵石。体力活，但能在大自然中工作。', { minCash: 0, maxCash: 400, financialRiskIn: ['low', 'medium'] }],
  ['代写论文', '有毕业生出高价请你代写毕业论文，一篇 5000 灵石。但学术不端的后果你承担不起。', { minCash: 0, maxCash: 500, financialRiskIn: ['high', 'extreme'] }],
  ['法器代售', '有炼器师请你帮忙代售法器，提成 15%。你看了看那些品质堪忧的「二手法器」，犹豫了。', { minCash: 0, maxCash: 600, financialRiskIn: ['medium', 'high'] }],
]

workData.forEach(([title, body, trigger]) => {
  events.push(mkEvent({
    id: eid('work'), title: `零工：${title}`, body, type: 'work',
    family: '零工', tone: title.includes('骗局') || title.includes('克扣') || title.includes('传销') ? 'danger' : 'info',
    weight: 3 + Math.floor(Math.random() * 3), cooldownDays: 2 + Math.floor(Math.random() * 3),
    trigger, options: stdOptions()
  }))
})

// ============ 修仙挫折类 (35) ============
const cultivationData = [
  ['筑基无望', '你已经卡在练气期大圆满三个月了。灵气在经脉中打转，就是无法凝聚成筑基丹。', {}],
  ['速成班', '「七天突破筑基，无效退款！」你交了 3000 灵石，结果讲师只教了你如何调整呼吸。', { minCash: 1000, financialRiskIn: ['medium'] }],
  ['灵气配额', '学院宣布缩减普通班学生的灵气配额——「示范班优先」。你感到丹田中的灵气越来越稀薄。', {}],
  ['走火入魔', '修炼时灵气突然失控，你感到经脉一阵剧痛。走火入魔的前兆——你需要立刻停止修炼。', { minDelinquency: 1 }],
  ['分班考试', '分班考试还有三天。考不上示范班，你就只能继续忍受灵气配额的歧视。', {}],
  ['VIP课程', '「VIP 学员享有专属灵气室和一对一辅导。」年费 8000 灵石——你一年的贷款都不够。', { minCash: 0, maxCash: 5000, financialRiskIn: ['medium', 'high'] }],
  ['天赋差距', '同一个功法，示范班的同学三天就入门了。你已经练了半个月，连灵气都感应不到。', {}],
  ['秘境名额', '学院开放了秘境修炼名额，但每个班只有 3 个。班长说「综合评估」——你知道那意味着什么。', {}],
  ['保过协议', '「签保过协议，不过全额退款！」你仔细看了条款——退款条件是「全程参加培训且完成所有作业」。', { minCash: 500, maxCash: 5000, financialRiskIn: ['medium'] }],
  ['丹方缺失', '你需要一份筑基丹的辅助丹方，但市面上能买到的都是残本。完整版——那是示范班的特权。', {}],
  ['推荐信', '导师说「名额有限」，暗示你主动放弃推荐机会。你看着他桌上示范班学生的名单，沉默了。', {}],
  ['灵力暴走', '修炼时灵力突然暴走，你不得不中断。这是本月第三次了——你的身体似乎在抗拒修炼。', { minDelinquency: 1 }],
  ['丹药限购', '学院丹药铺宣布「筑基丹限购」——示范班学生每月可购 3 枚，普通班 1 枚，末位班不售卖。', {}],
  ['名师一对一', '「金丹期名师亲自授课，一小时 500 灵石。」你算了算，这相当于你一个月的生活费。', { minCash: 200, maxCash: 3000, financialRiskIn: ['medium'] }],
  ['心魔滋生', '修炼时杂念越来越多——债务、催收、同学的歧视。心魔正在滋生，你需要找到方法清除它。', { minDelinquency: 1 }],
  ['淘汰机制', '学院新政策：连续两次月考排名末位 10% 的学生将被「劝退」。你看了看上次的成绩——第 89 百分位。', {}],
  ['经脉堵塞', '你感到经脉中灵气运行不畅，像是被什么东西堵住了。老中医说这是「灵力淤积」，需要昂贵的疏通丹药。', {}],
  ['灵脉分配', '学院灵脉使用权重新分配——示范班学生优先使用甲级灵脉，普通班只能用乙级，末位班去后山自己找。', {}],
  ['内部资料', '「独家内部资料，外面买不到的。」你花了 800 灵石买了一沓复印件——内容和图书馆的典籍差不多。', { minCash: 500, maxCash: 2000, financialRiskIn: ['medium'] }],
  ['根基不稳', '导师检查你的修为后皱眉：「你的根基太虚了，这样强行突破会伤及根本。」但下个月的考试等不了你打基础。', {}],
  ['特长加分', '「有炼丹/炼器特长的学生加分 20%。」你什么都没有——你只是普通班一个连筑基都困难的普通学生。', {}],
  ['灵气稀薄', '你发现修炼效果越来越差——不是你的问题，是学院周边的灵气浓度在下降。但示范班的独立灵气室不受影响。', {}],
  ['功法分级', '学院藏书阁的功法被分级——甲级功法只对示范班开放。你翻阅的乙级功法，已经是十年前的旧版本了。', {}],
  ['考前冲刺', '「三天冲刺班，押中率 80%！」你交了钱，发现所谓的「押题」就是把历年真题重新排列组合。', { minCash: 300, maxCash: 2000, financialRiskIn: ['medium'] }],
  ['丹毒积累', '长期服用低阶丹药帮助你修炼，但丹毒已经在体内积累。医师说需要「洗髓」——那又是一笔不小的开销。', { minDelinquency: 1 }],
  ['家庭背景', '你听到示范班的学生在讨论：「我爸给学院捐了一座灵气塔。」你默默低下头——你的父母只是凡人。', {}],
  ['天资有限', '测灵石显示你的天资等级是「中下」。导师委婉地说：「有些东西，不是努力就能弥补的。」', {}],
  ['导师青睐', '导师把最好的资源都给了「有潜力」的学生。你试图争取，但他说：「你的精力应该放在还债上。」', { minDelinquency: 1 }],
  ['功法不兼容', '你从黑市买来的功法与自身体质不兼容，强行修炼导致灵气逆流。你咳出了一口血。', { minDelinquency: 1 }],
  ['保送协议', '「签约保送示范班，不过退 50%。」你签了——后来才知道，保送的条件是月考进入前 5%，而那几乎不可能。', { minCash: 1000, maxCash: 5000, financialRiskIn: ['medium'] }],
  ['年龄焦虑', '你看了看身边的同学——有些人已经筑基成功，而你还在练气期徘徊。年龄越大，突破越难。', {}],
  ['心境不稳', '导师说你「心境不稳」，不适合继续突破。你知道原因——债务的压力让你无法入定。', { minDelinquency: 1 }],
  ['法宝分配', '学院发放修炼法宝——示范班每人一件灵器，普通班共享几件法器，末位班用木剑练习吧。', {}],
  ['同窗碾压', '和你一起入学的同学已经突破筑基了，而你还在原地踏步。他在朋友圈发了庆祝动态，你点了个赞，手指微微发抖。', {}],
  ['末位淘汰', '学院官网发布了「末位淘汰制」实施细则——排名末位 5% 的学生将被取消学籍。你的名字在边缘线上。', {}],
]

cultivationData.forEach(([title, body, trigger]) => {
  events.push(mkEvent({
    id: eid('cultivation'), title: `修仙：${title}`, body, type: 'cultivation',
    family: '修仙', tone: title.includes('暴走') || title.includes('入魔') || title.includes('淘汰') ? 'danger' : 'warn',
    weight: 3 + Math.floor(Math.random() * 3), cooldownDays: 3 + Math.floor(Math.random() * 3),
    trigger, options: stdOptions()
  }))
})

// ============ 制度压迫类 (35) ============
const institutionData = [
  ['信用评分', '学院推出了「学生信用评分系统」——还款记录、课堂表现、修炼成绩全部纳入评分。低分者将受到限制。', {}],
  ['辅导员', '辅导员暗示你「主动」参加他推荐的高息贷款平台——否则平时成绩会受影响。你看着他桌上的「优秀学生」名单，沉默了。', {}],
  ['连带责任', '学院新规：同宿舍一人逾期，全宿舍的灵气配额下调。室友的眼神开始变得不友善。', { minDelinquency: 1 }],
  ['行为监控', '学院在宿舍安装了「行为监控系统」——美其名曰「安全」，但你知道这是为了监控学生的修炼状态。', {}],
  ['学术霸凌', '导师把最好的研究课题都给了「关系户」，你只能做最基础的杂活。他说是「锻炼你的基础」。', {}],
  ['灵力征信', '灵力使用记录将被纳入征信系统——修炼时间异常、灵气消耗过低都可能影响信用评级。', {}],
  ['举报制度', '学院鼓励「互相监督」——举报同学违规修炼可以获得信用加分。你发现有人在偷偷记录你的一举一动。', {}],
  ['学生会', '学生会干部开始「检查」普通班的修炼情况——语气居高临下，仿佛他们已经是学院管理者了。', {}],
  ['强制体检', '学院要求所有学生进行「灵力体检」——实际上是为了评估每个学生的身体资产价值。你的数据被记录在案。', {}],
  ['信息封锁', '你发现学院的「学生论坛」开始删帖——关于贷款投诉、灵气分配不公的帖子全部消失了。', {}],
  ['考核指标', '学院给每个学生设定了「月度修炼指标」——未达标者将被标记为「低效学生」，影响毕业评估。', {}],
  ['教师特权', '有教师私下向你兜售「内部丹药」——价格比学院药店高三倍，但效果确实更好。你知道举报没有用。', {}],
  ['信用联动', '学院宣布与外部金融机构「信用联动」——在校逾期记录将影响毕业后的就业和贷款。', { minDelinquency: 1 }],
  ['资源倾斜', '学院预算报告泄露——示范班的人均经费是末位班的 7 倍。你看着手中发黄的教材，苦笑了一下。', {}],
  ['强制实习', '学院与某灵石矿企签订协议——所有学生必须「实习」一个月，报酬只有市场价的 30%。', {}],
  ['学术腐败', '你发现某篇获奖论文的数据是伪造的——作者是院长的亲戚。你试图反映，但被告知「不要多管闲事」。', {}],
  ['灵力税', '学院宣布对「超额修炼」的学生征收「灵力调节费」——你每个月多修炼的 20 个时辰都要交钱。', {}],
  ['沉默螺旋', '在学院大会上，校长问「大家对贷款政策有什么意见？」全场沉默。你知道第一个发言的人会成为靶子。', {}],
  ['行为积分', '学院推出「学生行为积分系统」——上课迟到扣 2 分，修炼不认真扣 3 分，逾期扣 10 分。积分过低将触发「干预」。', {}],
  ['导师剥削', '导师让你帮他完成私人研究项目——没有报酬，没有署名权。他说这是「给你的锻炼机会」。', {}],
  ['强制保险', '学院要求所有学生购买「修炼意外险」——每月 150 灵石，从你的贷款中自动扣除。', {}],
  ['分层管理', '学院实行「分层管理」制度——不同等级的学生享有不同的权限。你的通行令牌只能打开最基础的设施。', {}],
  ['数据共享', '学院宣布将学生数据与金融机构「共享」——你的修炼数据、消费记录、社交关系，全部透明化。', {}],
  ['评选不公', '「优秀学生」评选结果公布了——前 10 名都是示范班学生。你看了看评选标准：「综合评估」——一个无法量化的词。', {}],
  ['灵力管制', '学院对「非法灵气获取」进行管制——私下交易灵气将被处以 10 倍罚款。但示范班的特权通道不受影响。', {}],
  ['舆论引导', '学院官网发布了「优秀学生还贷典范」——一个靠家庭背景还清贷款的学生被树为典型。下面的评论全部是好评。', {}],
  ['强制辅导', '信用评分低于标准的学生将被「强制心理辅导」——实际上是还款催收的压力测试。每周两次，不得缺席。', { minDelinquency: 1 }],
  ['课题垄断', '好的研究课题都被「关系户」挑走了，剩下的都是没人要的边角料。导师说：「你先从这些开始锻炼。」', {}],
  ['信用修复', '学院推出「信用修复课程」——收费 500 灵石，上完可以加 10 分信用分。你算了一下，这又是一笔支出。', { minDelinquency: 1 }],
  ['同辈监视', '学院实行「小组责任制」——小组内有人违规，全组扣分。你开始不自觉地监视组员的修炼行为。', {}],
  ['灵力配额', '学院宣布根据「综合评分」分配灵气配额——你的评分是 D 级，每月只能获得 30% 的标准配额。', {}],
  ['招生腐败', '你听说今年的招生有「内部名额」——只要交够「赞助费」，天资不够也能进示范班。你看了看自己的贷款余额。', {}],
  ['毕业清算', '学院发布「毕业清算通知」——毕业前必须结清所有欠款，否则将暂缓发放学位证书。', { minDelinquency: 1 }],
  ['信息不对称', '你发现示范班的学生早就知道新政策了——而你是在官网公告栏上看到的。信息差，也是一种特权。', {}],
  ['灵力信用贷', '学院推出「灵力信用贷」——用未来的灵力产出做抵押获取贷款。你看着合同上「违约将限制人身自由」的条款，犹豫了。', { minCash: 0, maxCash: 1000, financialRiskIn: ['medium', 'high'] }],
]

institutionData.forEach(([title, body, trigger]) => {
  events.push(mkEvent({
    id: eid('institution'), title: `制度：${title}`, body, type: 'institution',
    family: '制度', tone: title.includes('腐败') || title.includes('霸凌') || title.includes('清算') ? 'danger' : 'warn',
    weight: 3 + Math.floor(Math.random() * 3), cooldownDays: 3 + Math.floor(Math.random() * 3),
    trigger, options: stdOptions()
  }))
})

// ============ 身体偿还类 (30) ============
const bodyData = [
  ['灵力器官', '贷款中介建议你「抵押」部分灵力器官来获取更低利率。你知道那意味着什么——你的修炼能力将永久下降。', { minCash: 0, maxCash: 2000, financialRiskIn: ['high', 'extreme'] }],
  ['天价丹药', '你修炼受伤需要治疗，但丹药铺的价格是你无法承受的。「没钱？那你的身体就是抵押品。」', { minCash: 0, maxCash: 1000, financialRiskIn: ['high', 'extreme'] }],
  ['债务纹身', '「逾期未还款的学生需要在手臂上烙下债务标记。」你看着那个丑陋的印记，感到身体不再属于自己。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['灵力外借', '有机构提供「灵力器官租赁」服务——把你的灵力器官租给别人使用，换取租金。但租期结束后，器官功能可能无法恢复。', { minCash: 0, maxCash: 1500, financialRiskIn: ['high', 'extreme'] }],
  ['血脉抽取', '「可以用血脉精华抵债。」你看着那根粗大的针管，想起了凡人的血汗工厂——只是这次被抽取的是你的修仙根基。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['过度治疗', '丹药堂的医师给你开了「最好的药」——价格是天价，但你别无选择。你知道其中有一半是吃回扣的。', { minCash: 0, maxCash: 1000 }],
  ['信用烙印', '学院要求逾期学生在额头烙上「信用不良」的印记——不痛，但每个人看你的眼神都变了。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['灵根交易', '暗网上有人在收购「废弃灵根」——你咨询了一下，发现自己的一根副灵根可以卖 5000 灵石。但那会影响你的一生。', { minCash: 0, maxCash: 3000, financialRiskIn: ['extreme'] }],
  ['精血献祭', '贷款方提出「精血抵债」方案——每月献祭一定量精血来抵扣利息。你知道那会永久降低你的修炼天赋。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['分期付款', '治疗费用可以「分期支付」——但利率比你欠的贷款还高。你看着自己受伤的身体，陷入了两难。', { minCash: 0, maxCash: 2000, financialRiskIn: ['medium', 'high'] }],
  ['灵力纹身', '催收公司要求你在手臂上纹上债务金额——每还清 1000 灵石可以消除一个零。你看着自己空荡荡的手臂。', { minDelinquency: 1, financialRiskIn: ['high'] }],
  ['经脉出租', '有机构提供「经脉出租」服务——把你的经脉借给需要突破的修士使用。每天 500 灵石，但经脉会永久受损。', { minCash: 0, maxCash: 2000, financialRiskIn: ['high', 'extreme'] }],
  ['寿元抵押', '「可以用寿元做抵押。」你吓了一跳——但仔细想想，修仙界最不缺的就是时间，最缺的就是灵石。', { minDelinquency: 2, financialRiskIn: ['extreme'] }],
  ['替代疗法', '丹药堂推荐了「更经济」的替代疗法——价格只有原来的三分之一，但效果也只有三分之一。你的伤势在恶化。', { minCash: 0, maxCash: 1000, financialRiskIn: ['medium'] }],
  ['债务项圈', '逾期学生需要佩戴「灵力监测项圈」——实时上传你的灵力数据。摘下来就会触发警报。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['丹田分割', '暗网医生可以做「丹田分割」手术——把你的一部分丹田卖给需要的人。报酬丰厚，但你从此再也无法突破更高境界。', { minCash: 0, maxCash: 5000, financialRiskIn: ['extreme'] }],
  ['气血透支', '催收公司要求你签订「气血透支协议」——每月抽取一定量的气血来抵债。你知道那会让你的身体加速衰老。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['保险捆绑', '购买丹药必须搭配「疗效保险」——否则不卖。你看了看保险条款，发现理赔条件苛刻到几乎不可能达到。', { minCash: 0, maxCash: 2000, financialRiskIn: ['medium'] }],
  ['信用评级环', '你的手腕上出现了一个灵力显示环——绿色代表信用良好，红色代表逾期。你现在是深红色。', { minDelinquency: 1, financialRiskIn: ['high'] }],
  ['识海共享', '有机构提供「识海共享」服务——让你的识海被他人临时使用，每天 800 灵石。但识海受损是不可逆的。', { minCash: 0, maxCash: 3000, financialRiskIn: ['high', 'extreme'] }],
  ['骨髓抽取', '「骨髓精华可以抵债。」你躺在手术台上，感受着生命从身体中被一点点抽离。', { minDelinquency: 2, financialRiskIn: ['extreme'] }],
  ['器官评估', '催收公司派人来评估你的「器官价值」——丹田 30000 灵石，经脉 15000，识海 50000。你感到自己像一件商品。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['灵根封印', '「不还款就封印你的灵根。」你感到丹田中一阵冰凉——他们不是在吓唬你。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['身体拍卖', '你收到一份通知——「逾期未还款学生的身体资产将进入拍卖程序。」你知道这不是玩笑。', { minDelinquency: 3, financialRiskIn: ['extreme'] }],
  ['灵力抽血', '催收方要求你签署「灵力血液抽取同意书」——每月抽取 200ml 灵力血液抵债。', { minDelinquency: 2, financialRiskIn: ['high'] }],
  ['经络改造', '有黑市医生提供「经络改造」——把你的经络改造成更适合劳工的类型，报酬丰厚，但从此与修仙无缘。', { minCash: 0, maxCash: 5000, financialRiskIn: ['extreme'] }],
  ['身体检查', '催收公司要求你进行「全面身体检查」——你知道他们在评估你的器官价值，为下一步做准备。', { minDelinquency: 1, financialRiskIn: ['high'] }],
  ['器官标签', '你的器官被贴上了「已抵押」标签——未经债权方允许，不得进行任何可能损害器官的治疗。', { minDelinquency: 2, financialRiskIn: ['high', 'extreme'] }],
  ['身体租赁', '「把你的身体租给需要的人使用一天，5000 灵石。」你看着镜子里的自己，感到一阵恶心。', { minCash: 0, maxCash: 3000, financialRiskIn: ['extreme'] }],
  ['生命倒计时', '催收方发来一条消息：「你的身体资产价值正在贬值——年龄越大，器官越不值钱。尽快还款。」', { minDelinquency: 2, financialRiskIn: ['high'] }],
]

bodyData.forEach(([title, body, trigger]) => {
  events.push(mkEvent({
    id: eid('body'), title: `身体：${title}`, body, type: 'body',
    family: '身体', tone: 'danger',
    weight: 5 + Math.floor(Math.random() * 3), cooldownDays: 4 + Math.floor(Math.random() * 3),
    trigger, options: stdOptions()
  }))
})

// ============ 社交关系类 (30) ============
const socialData = [
  ['朋友疏远', '你发现朋友们开始有意无意地避开你——大概是因为你的逾期状态被公开了。', { minDelinquency: 1 }],
  ['同学炫耀', '同窗在群里晒新买的灵器——那是你三个月的生活费。你默默退出了群聊。', {}],
  ['利益交换', '一个同学提出「帮你还一部分贷款」，条件是你帮他完成下个月的月考。你犹豫了。', { minDelinquency: 1, financialRiskIn: ['medium', 'high'] }],
  ['背叛', '你最好的朋友把你欠款的秘密告诉了全班。他说是「为了你好」——让大家监督你还钱。', { minDelinquency: 1 }],
  ['恋爱压力', '你的道侣说：「如果你连贷款都还不清，我们怎么可能有未来。」你无言以对。', { minDelinquency: 1 }],
  ['家族压力', '家族来信：「听说你在学院欠了钱？别给我们家族丢脸。」你看着信纸，手指微微发抖。', { minDelinquency: 1 }],
  ['社交排斥', '班级聚会没有叫你——你知道原因。你的「信用状态」让大家感到不安。', { minDelinquency: 1 }],
  ['谣言传播', '学院里开始流传关于你的谣言——说你借了高利贷去赌博。你知道这是催收方的手段。', { minDelinquency: 2 }],
  ['同伴借贷', '一个同学向你推荐新的贷款平台——「利息比学院低多了。」你看着他眼中闪烁的光，心里警铃大作。', { minCash: 0, maxCash: 1000, financialRiskIn: ['medium'] }],
  ['社交孤立', '你已经三天没有和任何人说过话了。不是不想说，是没有人愿意和你说话。', { minDelinquency: 2 }],
  ['攀比', '同宿舍的同学都在讨论暑假去哪修炼——你只能在角落里沉默。你的存款只够还利息。', {}],
  ['友情考验', '一个朋友向你借钱——你知道他也陷入了债务危机。你该借吗？', {}],
  ['社交恐惧', '你开始害怕去人多的地方——总觉得每个人都在议论你的欠款。', { minDelinquency: 1 }],
  ['关系利用', '有同学主动接近你——后来你才知道，他是催收公司派来打探你财务状况的。', { minDelinquency: 1 }],
  ['信任危机', '你不再相信任何人了——因为每个接近你的人都可能带着目的。', { minDelinquency: 2 }],
  ['社交伪装', '你学会了在同学面前假装一切正常——但只有你自己知道，深夜的焦虑有多真实。', { minDelinquency: 1 }],
  ['同伴压力', '室友都在讨论报哪个补习班——你只能说自己「已经报了」。其实你连饭都快吃不起了。', {}],
  ['社交债务', '你欠了朋友 500 灵石——现在他看你的眼神和催收员越来越像了。', { minDelinquency: 1 }],
  ['关系破裂', '你的道侣留下一封信走了——「我受不了这种担惊受怕的日子了。」信纸上有泪痕。', { minDelinquency: 2 }],
  ['社交焦虑', '每次手机响起你都心头一紧——怕是催收，又怕不是催收。', { minDelinquency: 1 }],
  ['虚假朋友', '那个说「有困难找我」的朋友，在你真正开口时找了个借口溜走了。', { minDelinquency: 1 }],
  ['社交比较', '你看着朋友圈里同学们的修炼进步——再看看自己停滞不前的修为，感到一阵窒息。', {}],
  ['关系交易', '有人提出「介绍资源给你」——条件是你在学院里帮他做一些「不方便出面」的事。', { minCash: 0, maxCash: 1000, financialRiskIn: ['medium', 'high'] }],
  ['社交疲惫', '你已经没有精力去维持任何社交关系了——每天应对催收和修炼就已经耗尽了你所有的力气。', { minDelinquency: 2 }],
  ['同病相怜', '你遇到了一个同样欠款的同学——你们相视一笑，那笑容里包含了太多无奈。', { minDelinquency: 1 }],
  ['社交逃避', '你开始逃课——不是不想学，是不想面对同学们的目光。', { minDelinquency: 1 }],
  ['关系修复', '一个曾经疏远你的朋友突然联系你——说想帮你介绍一份兼职。你犹豫着要不要相信他。', { minDelinquency: 1 }],
  ['社交标签', '你发现自己在别人口中的绰号变成了「那个欠钱的」——没有人当面叫你，但你知道他们在背后怎么说。', { minDelinquency: 2 }],
  ['群体孤立', '整个小组都不愿意和你合作——怕你的「信用问题」影响他们的小组评分。', { minDelinquency: 1 }],
  ['最后的善意', '一个陌生人悄悄在你桌上放了一瓶疗伤丹药和一张纸条：「加油。」你握紧纸条，眼眶湿润了。', {}],
]

socialData.forEach(([title, body, trigger]) => {
  events.push(mkEvent({
    id: eid('social'), title: `社交：${title}`, body, type: 'social',
    family: '社交', tone: title.includes('背叛') || title.includes('破裂') || title.includes('孤立') ? 'danger' : 'warn',
    weight: 3 + Math.floor(Math.random() * 3), cooldownDays: 3 + Math.floor(Math.random() * 3),
    trigger, options: stdOptions()
  }))
})

// Write output
const outputPath = path.resolve('public/seed-events.json')
fs.writeFileSync(outputPath, JSON.stringify(events, null, 2) + '\n')
console.log(`Generated ${events.length} seed events -> ${outputPath}`)
