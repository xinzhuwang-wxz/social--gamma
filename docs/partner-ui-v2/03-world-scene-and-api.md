# 社交森林：世界场景与 MVP API 边界

## 1. 产品壳

首屏不是传统 App 首页，而是可探索的花园世界。导航入口必须落在场景对象上：

| 场景对象 | 入口 | 含义 |
|---|---|---|
| 房子 | Home 室内 | 宠物生活、装扮、Owner Model |
| 红信箱 | 种子信箱 | 收到的行动邀请与发出的种子 |
| 中央花圃 | 发布／当前行动 | 空地时种下，生长后进入行动房间 |
| 小桥 | 行动房间 | 从个人世界走向与他人的共同行动 |
| 回忆林 | 已完成经历 | BLOOM / FOREST 植物与再次发起 |
| 宠物 | 轻互动 | 对话、睡觉、旅行，不承担主要导航栏职责 |

花园已接入 `assets/garden-background.png`，繁荣花园与回忆林使用 `assets/garden-scene.png`，Home 使用 `assets/home-interior.png`。热点层与底图分离；继续替换背景、前景或动画部件时不需要改业务路由。

## 2. 前后端并行边界

前端只请求事实变更，后端返回完整快照与派生阶段：

| 方法 | API | 用途 |
|---|---|---|
| GET | `/api/demo` | 获取当前演示快照 |
| POST | `/api/gatherings/publish` | 发布结构化行动种子 |
| POST | `/api/gatherings/select` | 发起人选择同行者 |
| POST | `/api/chat/messages` | 发送真人聊天消息 |
| POST | `/api/proposals/confirm` | 用户确认 `time` 或 `place` 提案 |
| POST | `/api/gatherings/check-in` | 行动打卡 |
| POST | `/api/gatherings/archive` | 将共同经历收进森林 |
| POST | `/api/demo/reset` | 重置路演数据 |

后端阶段规则：

```text
FOREST  archived = true
BLOOM   checkedIn = true
BUD     people + time + place 都已确认
GROWING time / place 任一确认
LEAF    有首次真人消息
SPROUT  已选择同行者
SEED    其余情况
```

任何 LLM 只能提出槽位变更，不能直接写 `stage` 或已确认槽位。正式后端替换当前内存服务时，保持响应快照结构不变即可并行联调。
