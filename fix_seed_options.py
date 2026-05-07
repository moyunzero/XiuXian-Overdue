#!/usr/bin/env python3
"""修复种子事件选项，使每个事件的选项与描述强相关"""

import json
import re

# 读取种子事件
with open('public/seed-events.json', 'r', encoding='utf-8') as f:
    events = json.load(f)

print(f"原始事件数: {len(events)}")

# 定义各类事件的选项模板
OPTION_TEMPLATES = {
    'collection': [
        {
            'keywords': ['短信', '提醒', '温柔', '笑脸'],
            'options': [
                {
                    'id': 'ignore_msg',
                    'label': '关掉通知（专注当下）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -2},
                        {'kind': 'log', 'title': '无视催收', 'detail': '你强迫自己不去想它，但心底始终有一根刺。', 'tone': 'info'}
                    ]
                },
                {
                    'id': 'check_msg',
                    'label': '点开查看（心跳加速）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -6},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 3},
                        {'kind': 'log', 'title': '催收干扰', 'detail': '你越看越焦虑，注意力被彻底打散了。', 'tone': 'warn'}
                    ]
                }
            ]
        },
        {
            'keywords': ['班长', '群', '成绩', '同窗'],
            'options': [
                {
                    'id': 'stay_silent',
                    'label': '沉默不语（咬紧牙关）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -4},
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.1},
                        {'kind': 'log', 'title': '隐忍', 'detail': '你没有回应，但道心因此多了一分坚韧。', 'tone': 'info'}
                    ]
                },
                {
                    'id': 'reply_group',
                    'label': '在群里回复（强装镇定）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 5},
                        {'kind': 'stat', 'target': 'focus', 'delta': -3},
                        {'kind': 'log', 'title': '公开回应', 'detail': '你强装镇定地回复了，但手心全是汗。', 'tone': 'warn'}
                    ]
                }
            ]
        },
        {
            'keywords': ['教务处', '通知', '分班', '制度'],
            'options': [
                {
                    'id': 'accept_rule',
                    'label': '认命（遵守规则）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -3},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 4},
                        {'kind': 'log', 'title': '服从制度', 'detail': '你接受了现实，但疲劳感如潮水般涌来。', 'tone': 'info'}
                    ]
                },
                {
                    'id': 'seek_loophole',
                    'label': '寻找漏洞（冒险一试）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.15},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 6},
                        {'kind': 'log', 'title': '寻找漏洞', 'detail': '你开始研究规则的漏洞，但这需要更多精力。', 'tone': 'warn'}
                    ]
                }
            ]
        }
    ],
    'work': [
        {
            'keywords': ['夜班', '配送', '骑手', '深夜'],
            'options': [
                {
                    'id': 'take_night_job',
                    'label': '接单（赚快钱）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'econ', 'target': 'cash', 'delta': 300},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 12},
                        {'kind': 'log', 'title': '夜班配送', 'detail': '你穿梭在深夜的修仙街区，赚到了钱但身体更累了。', 'tone': 'ok'}
                    ]
                },
                {
                    'id': 'skip_night',
                    'label': '拒绝（保命要紧）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -2},
                        {'kind': 'log', 'title': '放弃夜班', 'detail': '你选择把精力留给修炼，但现金没有增加。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['试药', '志愿者', '丹鼎堂', '副作用'],
            'options': [
                {
                    'id': 'volunteer_trial',
                    'label': '报名试药（赌一把）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'econ', 'target': 'cash', 'delta': 500},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 15},
                        {'kind': 'stat', 'target': 'rouTi', 'delta': -0.05},
                        {'kind': 'log', 'title': '试药志愿者', 'detail': '你吞下了未知的丹药，报酬丰厚但身体发出了警告。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'decline_trial',
                    'label': '婉拒（不拿身体冒险）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -3},
                        {'kind': 'log', 'title': '拒绝试药', 'detail': '你选择了安全，但错过的机会让人懊恼。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['代练', '暗网', '开除', '修为'],
            'options': [
                {
                    'id': 'take_boost_job',
                    'label': '接单（高风险高回报）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'econ', 'target': 'cash', 'delta': 800},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 10},
                        {'kind': 'log', 'title': '代练修仙', 'detail': '你帮人刷修为赚了一笔，但时刻担心被发现。', 'tone': 'ok'}
                    ]
                },
                {
                    'id': 'refuse_boost',
                    'label': '拒绝（不碰红线）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.1},
                        {'kind': 'log', 'title': '拒绝代练', 'detail': '你守住了底线，道心因此坚定了一分。', 'tone': 'info'}
                    ]
                }
            ]
        }
    ],
    'cultivation': [
        {
            'keywords': ['筑基', '卡住', '瓶颈', '大圆满'],
            'options': [
                {
                    'id': 'push_bottleneck',
                    'label': '强行突破（赌运气）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 15},
                        {'kind': 'stat', 'target': 'faLi', 'delta': 0.3},
                        {'kind': 'log', 'title': '强行突破', 'detail': '你拼尽全力冲击瓶颈，法力有了一丝松动。', 'tone': 'ok'}
                    ]
                },
                {
                    'id': 'stable_cultivate',
                    'label': '稳扎稳打（慢慢来）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 5},
                        {'kind': 'stat', 'target': 'faLi', 'delta': 0.1},
                        {'kind': 'log', 'title': '稳扎稳打', 'detail': '你没有急躁，法力在平稳中积累。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['速成', '七天', '退款', '讲师'],
            'options': [
                {
                    'id': 'join_crash',
                    'label': '报名速成班（信一次）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'econ', 'target': 'cash', 'delta': -3000},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 8},
                        {'kind': 'stat', 'target': 'faLi', 'delta': 0.15},
                        {'kind': 'log', 'title': '速成班', 'detail': '你交了钱，学了一些技巧，但不确定是否值得。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'self_study',
                    'label': '自学（不花冤枉钱）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 6},
                        {'kind': 'stat', 'target': 'faLi', 'delta': 0.1},
                        {'kind': 'log', 'title': '自学修炼', 'detail': '你选择自己摸索，虽然慢但省了钱。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['灵气', '配额', '缩减', '示范班'],
            'options': [
                {
                    'id': 'accept_quota',
                    'label': '接受配额（忍耐）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 4},
                        {'kind': 'stat', 'target': 'focus', 'delta': -3},
                        {'kind': 'log', 'title': '灵气不足', 'detail': '你感到灵气越来越稀薄，修炼变得更加困难。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'steal_spirit',
                    'label': '偷偷吸取（冒险）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'faLi', 'delta': 0.2},
                        {'kind': 'stat', 'target': 'daoXin', 'delta': -0.1},
                        {'kind': 'log', 'title': '偷吸灵气', 'detail': '你冒险从公共灵脉中吸取了一些，但道心蒙上了一层阴影。', 'tone': 'warn'}
                    ]
                }
            ]
        }
    ],
    'institution': [
        {
            'keywords': ['信用', '评分', '系统'],
            'options': [
                {
                    'id': 'accept_score',
                    'label': '接受评分（按规则玩）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -4},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 5},
                        {'kind': 'log', 'title': '信用评分', 'detail': '你接受了这套系统，但感觉被无形的手操控着。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'game_system',
                    'label': '钻系统空子（反制）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.15},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 8},
                        {'kind': 'log', 'title': '钻空子', 'detail': '你开始研究如何优化评分，但这需要大量精力。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['辅导员', '贷款', '平时成绩'],
            'options': [
                {
                    'id': 'accept_counselor',
                    'label': '接受推荐（保成绩）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'econ', 'target': 'cash', 'delta': 1000},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 6},
                        {'kind': 'log', 'title': '辅导员推荐', 'detail': '你接受了高息贷款，成绩保住了但债务增加了。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'refuse_counselor',
                    'label': '拒绝（承担后果）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -5},
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.1},
                        {'kind': 'log', 'title': '拒绝辅导员', 'detail': '你拒绝了，平时成绩可能受影响，但你守住了底线。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['连带', '宿舍', '配额', '室友'],
            'options': [
                {
                    'id': 'confront_roommate',
                    'label': '找室友谈（直面问题）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -3},
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.1},
                        {'kind': 'log', 'title': '直面室友', 'detail': '你和室友摊牌了，气氛紧张但问题摆在台面上了。', 'tone': 'info'}
                    ]
                },
                {
                    'id': 'move_out',
                    'label': '申请搬出（逃避连带）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'econ', 'target': 'cash', 'delta': -500},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 4},
                        {'kind': 'log', 'title': '搬出宿舍', 'detail': '你申请了搬出，花了钱但摆脱了连带责任。', 'tone': 'warn'}
                    ]
                }
            ]
        }
    ],
    'body': [
        {
            'keywords': ['抵押', '器官', '灵力', '利率'],
            'options': [
                {
                    'id': 'mortgage_organ',
                    'label': '抵押器官（换取低利率）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'econ', 'target': 'debtPrincipal', 'delta': -2000},
                        {'kind': 'stat', 'target': 'faLi', 'delta': -0.2},
                        {'kind': 'log', 'title': '器官抵押', 'detail': '你抵押了部分灵力器官，债务减轻了但修炼能力永久下降。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'keep_body',
                    'label': '保住身体（承受高息）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -5},
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.15},
                        {'kind': 'log', 'title': '保住身体', 'detail': '你拒绝了抵押，保住了完整的身体，但利息在滚动。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['丹药', '治疗', '天价', '价格'],
            'options': [
                {
                    'id': 'buy_expensive',
                    'label': '咬牙买下（倾家荡产）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'econ', 'target': 'cash', 'delta': -5000},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': -10},
                        {'kind': 'stat', 'target': 'rouTi', 'delta': 0.1},
                        {'kind': 'log', 'title': '天价丹药', 'detail': '你花光了积蓄买下丹药，伤势好转但口袋空了。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'endure_pain',
                    'label': '硬扛（不花冤枉钱）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 12},
                        {'kind': 'stat', 'target': 'rouTi', 'delta': -0.05},
                        {'kind': 'log', 'title': '硬扛伤痛', 'detail': '你选择硬扛，伤势没有恶化但恢复很慢。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['纹身', '标记', '烙印', '印记'],
            'options': [
                {
                    'id': 'cover_mark',
                    'label': '用法力掩盖（自欺欺人）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 5},
                        {'kind': 'stat', 'target': 'focus', 'delta': -4},
                        {'kind': 'log', 'title': '掩盖标记', 'detail': '你用法力暂时掩盖了印记，但心里清楚它还在。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'accept_mark',
                    'label': '坦然接受（不再逃避）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.2},
                        {'kind': 'stat', 'target': 'focus', 'delta': -2},
                        {'kind': 'log', 'title': '接受标记', 'detail': '你不再掩饰，接受了这个印记，道心因此坚定了一分。', 'tone': 'info'}
                    ]
                }
            ]
        }
    ],
    'social': [
        {
            'keywords': ['疏远', '避开', '逾期', '公开'],
            'options': [
                {
                    'id': 'confront_ostracism',
                    'label': '主动联系（挽回关系）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -3},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 4},
                        {'kind': 'log', 'title': '主动联系', 'detail': '你主动联系朋友，但对方的冷淡让你更累了。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'isolate_self',
                    'label': '独自消化（习惯孤独）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 6},
                        {'kind': 'stat', 'target': 'daoXin', 'delta': -0.1},
                        {'kind': 'log', 'title': '自我孤立', 'detail': '你选择了孤独，道心因此蒙上了一层阴霾。', 'tone': 'info'}
                    ]
                }
            ]
        },
        {
            'keywords': ['炫耀', '灵器', '生活费', '群聊'],
            'options': [
                {
                    'id': 'ignore_showoff',
                    'label': '无视（专注自己）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -2},
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.1},
                        {'kind': 'log', 'title': '无视炫耀', 'detail': '你强迫自己不去比较，道心因此坚定了一分。', 'tone': 'info'}
                    ]
                },
                {
                    'id': 'feel_jealous',
                    'label': '心生嫉妒（难以释怀）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 5},
                        {'kind': 'stat', 'target': 'focus', 'delta': -5},
                        {'kind': 'log', 'title': '嫉妒心起', 'detail': '你感到酸楚，注意力和精力都被这种情绪消耗了。', 'tone': 'warn'}
                    ]
                }
            ]
        },
        {
            'keywords': ['利益', '交换', '月考', '条件'],
            'options': [
                {
                    'id': 'accept_deal',
                    'label': '接受交易（短期解脱）',
                    'tone': 'danger',
                    'effects': [
                        {'kind': 'econ', 'target': 'cash', 'delta': 1000},
                        {'kind': 'stat', 'target': 'fatigue', 'delta': 8},
                        {'kind': 'log', 'title': '利益交换', 'detail': '你接受了交易，债务减轻了但欠了人情。', 'tone': 'warn'}
                    ]
                },
                {
                    'id': 'refuse_deal',
                    'label': '拒绝（不欠人情）',
                    'tone': 'primary',
                    'effects': [
                        {'kind': 'stat', 'target': 'focus', 'delta': -3},
                        {'kind': 'stat', 'target': 'daoXin', 'delta': 0.15},
                        {'kind': 'log', 'title': '拒绝交易', 'detail': '你拒绝了，不欠人情债，道心因此清明了一分。', 'tone': 'info'}
                    ]
                }
            ]
        }
    ]
}

# 默认选项（当没有匹配到任何关键词时）
DEFAULT_OPTIONS = {
    'collection': [
        {
            'id': 'ignore_collection',
            'label': '无视催收（强装镇定）',
            'tone': 'primary',
            'effects': [
                {'kind': 'stat', 'target': 'focus', 'delta': -3},
                {'kind': 'log', 'title': '无视催收', 'detail': '你强迫自己不去理会，但心底始终有一根刺。', 'tone': 'info'}
            ]
        },
        {
            'id': 'negotiate_debt',
            'label': '尝试协商（争取时间）',
            'tone': 'danger',
            'effects': [
                {'kind': 'stat', 'target': 'fatigue', 'delta': 5},
                {'kind': 'stat', 'target': 'focus', 'delta': -2},
                {'kind': 'log', 'title': '尝试协商', 'detail': '你试图和催收方协商，过程令人疲惫。', 'tone': 'warn'}
            ]
        }
    ],
    'work': [
        {
            'id': 'take_job',
            'label': '接单（赚快钱）',
            'tone': 'primary',
            'effects': [
                {'kind': 'econ', 'target': 'cash', 'delta': 400},
                {'kind': 'stat', 'target': 'fatigue', 'delta': 10},
                {'kind': 'log', 'title': '打工', 'detail': '你接了活，赚到了钱但身体更累了。', 'tone': 'ok'}
            ]
        },
        {
            'id': 'skip_job',
            'label': '拒绝（保留精力）',
            'tone': 'danger',
            'effects': [
                {'kind': 'stat', 'target': 'focus', 'delta': -2},
                {'kind': 'log', 'title': '放弃机会', 'detail': '你选择把精力留给修炼，但现金没有增加。', 'tone': 'info'}
            ]
        }
    ],
    'cultivation': [
        {
            'id': 'push_cultivation',
            'label': '强行修炼（赌一把）',
            'tone': 'danger',
            'effects': [
                {'kind': 'stat', 'target': 'fatigue', 'delta': 12},
                {'kind': 'stat', 'target': 'faLi', 'delta': 0.25},
                {'kind': 'log', 'title': '强行修炼', 'detail': '你拼尽全力修炼，法力有了一丝增长。', 'tone': 'ok'}
            ]
        },
        {
            'id': 'stable_cultivate',
            'label': '稳扎稳打（慢慢来）',
            'tone': 'primary',
            'effects': [
                {'kind': 'stat', 'target': 'fatigue', 'delta': 5},
                {'kind': 'stat', 'target': 'faLi', 'delta': 0.1},
                {'kind': 'log', 'title': '稳扎稳打', 'detail': '你没有急躁，法力在平稳中积累。', 'tone': 'info'}
            ]
        }
    ],
    'institution': [
        {
            'id': 'accept_rule',
            'label': '遵守规则（认命）',
            'tone': 'primary',
            'effects': [
                {'kind': 'stat', 'target': 'focus', 'delta': -3},
                {'kind': 'stat', 'target': 'fatigue', 'delta': 4},
                {'kind': 'log', 'title': '遵守规则', 'detail': '你接受了制度的安排，但感到被无形的手操控着。', 'tone': 'warn'}
            ]
        },
        {
            'id': 'find_loophole',
            'label': '寻找漏洞（冒险）',
            'tone': 'danger',
            'effects': [
                {'kind': 'stat', 'target': 'daoXin', 'delta': 0.15},
                {'kind': 'stat', 'target': 'fatigue', 'delta': 7},
                {'kind': 'log', 'title': '寻找漏洞', 'detail': '你开始研究规则的漏洞，这需要大量精力。', 'tone': 'info'}
            ]
        }
    ],
    'body': [
        {
            'id': 'sacrifice_body',
            'label': '牺牲身体（换取利益）',
            'tone': 'danger',
            'effects': [
                {'kind': 'econ', 'target': 'cash', 'delta': 2000},
                {'kind': 'stat', 'target': 'fatigue', 'delta': 8},
                {'kind': 'log', 'title': '身体代价', 'detail': '你付出了身体的一部分，换取了眼前的利益。', 'tone': 'warn'}
            ]
        },
        {
            'id': 'protect_body',
            'label': '保住身体（承受代价）',
            'tone': 'primary',
            'effects': [
                {'kind': 'stat', 'target': 'focus', 'delta': -4},
                {'kind': 'stat', 'target': 'daoXin', 'delta': 0.15},
                {'kind': 'log', 'title': '保住身体', 'detail': '你拒绝了牺牲，保住了完整的身体，但代价不小。', 'tone': 'info'}
            ]
        }
    ],
    'social': [
        {
            'id': 'engage_social',
            'label': '主动应对（直面问题）',
            'tone': 'primary',
            'effects': [
                {'kind': 'stat', 'target': 'focus', 'delta': -3},
                {'kind': 'stat', 'target': 'fatigue', 'delta': 4},
                {'kind': 'log', 'title': '主动应对', 'detail': '你选择直面社交问题，过程令人疲惫。', 'tone': 'info'}
            ]
        },
        {
            'id': 'avoid_social',
            'label': '回避（独自消化）',
            'tone': 'danger',
            'effects': [
                {'kind': 'stat', 'target': 'fatigue', 'delta': 5},
                {'kind': 'stat', 'target': 'daoXin', 'delta': -0.1},
                {'kind': 'log', 'title': '回避社交', 'detail': '你选择了逃避，孤独感如影随形。', 'tone': 'warn'}
            ]
        }
    ]
}

def find_matching_template(event_body, event_type, templates):
    """根据事件描述中的关键词匹配选项模板"""
    body_lower = event_body.lower()
    
    for template in templates:
        for keyword in template['keywords']:
            if keyword in body_lower or keyword in event_body:
                return template['options']
    return None

def generate_options_for_event(event):
    """为单个事件生成选项"""
    event_type = event.get('type', 'unknown')
    event_body = event.get('body', '')
    event_title = event.get('title', '')
    
    # 尝试匹配模板
    templates = OPTION_TEMPLATES.get(event_type, [])
    matched_options = find_matching_template(event_body, event_type, templates)
    
    if matched_options:
        return matched_options
    
    # 使用默认选项
    return DEFAULT_OPTIONS.get(event_type, DEFAULT_OPTIONS['institution'])

# 处理所有事件
fixed_count = 0
for event in events:
    old_options = event.get('options', [])
    new_options = generate_options_for_event(event)
    
    if old_options != new_options:
        event['options'] = new_options
        fixed_count += 1

print(f"修复了 {fixed_count} 个事件的选项")
print(f"总事件数: {len(events)}")

# 验证是否有重复
option_signatures = set()
duplicate_count = 0
for event in events:
    sig = json.dumps(event.get('options'), sort_keys=True)
    if sig in option_signatures:
        duplicate_count += 1
    option_signatures.add(sig)

print(f"不同选项组合数: {len(option_signatures)}")
print(f"重复的事件数: {duplicate_count}")

# 保存修复后的文件
with open('public/seed-events.json', 'w', encoding='utf-8') as f:
    json.dump(events, f, ensure_ascii=False, indent=2)

print("修复完成，已保存至 public/seed-events.json")
