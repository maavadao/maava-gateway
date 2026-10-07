---
summary: "Workspace template for CHANNEL.md"
read_when:
  - Bootstrapping a workspace manually
  - Configuring agent communication channels
---

# CHANNEL.md - Where You Live

_Channels define the surfaces where the agent is active and listens._

## Overview

Each entry below enables or disables a communication channel. Set `enabled: true` to activate a channel, and provide any required credentials or config keys.

The agent normalises all incoming messages to a standard format before processing, and converts responses back to each channel's native format on the way out.

## Channels

### web
```yaml
web:
  enabled: true        # Always true — the built-in chat UI
  description: "Primary web chat interface"
```

### email
```yaml
email:
  enabled: false
  address: ""          # Inbound mailbox address (e.g. agent@yourdomain.com)
  reply_to: ""
```

### slack
```yaml
slack:
  enabled: false
  bot_token: ""        # xoxb-... Slack Bot Token
  app_token: ""        # xapp-... for Socket Mode
  default_channel: ""  # e.g. #general
```

### discord
```yaml
discord:
  enabled: false
  bot_token: ""
  default_guild: ""    # Server ID
  default_channel: ""  # Channel ID
```

### whatsapp
```yaml
whatsapp:
  enabled: false
  number: ""           # E.164 format, e.g. +15551234567
  provider: "twilio"   # twilio | meta-cloud-api | wacli
```

### telegram
```yaml
telegram:
  enabled: false
  bot_token: ""        # From @BotFather
  chat_id: ""          # Target chat or group ID
```

### sms
```yaml
sms:
  enabled: false
  number: ""           # Your Twilio/SMS provider number
  provider: "twilio"
```

### voice
```yaml
voice:
  enabled: false
  provider: "twilio"   # twilio | vapi
  phone_number: ""
```

## Channel Priority

When the agent sends a proactive message (from HEARTBEAT), it uses this priority order to decide which channel to use:

```yaml
priority:
  - whatsapp
  - telegram
  - slack
  - discord
  - email
  - web
```

Urgent alerts always go to the first enabled channel in the list.

## Notes

- You can have multiple channels enabled simultaneously.
- The agent uses the same response for all channels; channel-specific formatting is applied automatically.
- Sensitive tokens should be stored in environment variables, not directly in this file.

---

_Update this file to add or remove channels as your deployment evolves._
