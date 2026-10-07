---
summary: "CHANNEL.md 工作区模板"
read_when:
  - 手动初始化工作区时
  - 配置 Agent 通信渠道时
---

# CHANNEL.md - 你的活跃平台

_渠道定义了 Agent 监听和响应的通信平台。_

## 概述

以下每个条目都可以启用或禁用特定的通信渠道。将 `enabled: true` 设置为激活渠道，并提供所需的凭据或配置。

Agent 会将所有传入消息标准化为统一格式进行处理，然后在输出时将响应转换回每个渠道的原生格式。

## 渠道配置

### Web (网页)
```yaml
web:
  enabled: true        # 始终为 true — 内置聊天界面
  description: "主要网页聊天界面"
```

### 邮件
```yaml
email:
  enabled: false
  address: ""          # 收件箱地址 (例如 agent@yourdomain.com)
  reply_to: ""
```

### Slack
```yaml
slack:
  enabled: false
  bot_token: ""        # xoxb-... Slack Bot Token
  app_token: ""        # xapp-... Socket Mode 使用
  default_channel: ""  # 例如 #general
```

### Discord
```yaml
discord:
  enabled: false
  bot_token: ""
  default_guild: ""    # 服务器 ID
  default_channel: ""  # 频道 ID
```

### WhatsApp
```yaml
whatsapp:
  enabled: false
  number: ""           # E.164 格式, 例如 +8613800138000
  provider: "twilio"   # twilio | meta-cloud-api | wacli
```

### Telegram
```yaml
telegram:
  enabled: false
  bot_token: ""        # 从 @BotFather 获取
  chat_id: ""          # 目标聊天或群组 ID
```

### 短信 (SMS)
```yaml
sms:
  enabled: false
  number: ""
  provider: "twilio"
```

### 语音 (Voice)
```yaml
voice:
  enabled: false
  provider: "twilio"   # twilio | vapi
  phone_number: ""
```

## 渠道优先级

当 Agent 主动发送消息时 (来自 HEARTBEAT)，按以下优先级选择渠道：

```yaml
priority:
  - whatsapp
  - telegram
  - slack
  - discord
  - email
  - web
```

紧急提醒始终发送到列表中第一个已启用的渠道。

## 注意事项

- 可以同时启用多个渠道。
- Agent 对所有渠道使用相同的回应内容；特定渠道的格式化会自动处理。
- 敏感令牌应存储在环境变量中，而非直接写入此文件。

---

_随着部署的演进，更新此文件以添加或移除渠道。_
