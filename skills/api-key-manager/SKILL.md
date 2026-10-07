---
name: api-key-manager
description: Configure API keys for skills via chat. List what keys are needed and set them live.
metadata: { "openclaw": { "emoji": "🔑" } }
---

# API Key Manager

Help users configure API keys for skills that require external service credentials.

## Skills Requiring API Keys

| Skill | Env Variable | Service |
|-------|-------------|---------|
| goplaces | `GOOGLE_PLACES_API_KEY` | Google Places API |
| local-places | `GOOGLE_PLACES_API_KEY` | Google Places API |
| openai-image-gen | `OPENAI_API_KEY` | OpenAI (DALL·E) |
| openai-whisper-api | `OPENAI_API_KEY` | OpenAI (Whisper) |
| nano-banana-pro | `GEMINI_API_KEY` | Google Gemini |
| sag | `ELEVENLABS_API_KEY` | ElevenLabs TTS |
| notion | `NOTION_API_KEY` | Notion API |
| trello | `TRELLO_API_KEY`, `TRELLO_TOKEN` | Trello API |
| sherpa-onnx-tts | `SHERPA_ONNX_RUNTIME_DIR`, `SHERPA_ONNX_MODEL_DIR` | Sherpa-ONNX (local) |
| github | `GITHUB_TOKEN` | GitHub (via gh CLI auth) |

## How to Set an API Key via Chat

When the user asks to set, configure, or update an API key for a skill, follow these steps:

### Step 1 — Read the current config

```bash
CONFIG_JSON=$(curl -s -X POST http://localhost:${PORT:-8080}/api/config/get \
  -H "Content-Type: application/json" -d '{}')
HASH=$(echo "$CONFIG_JSON" | jq -r '.hash')
echo "Current config hash: $HASH"
```

### Step 2 — Apply the patch

Replace `<SKILL_KEY>`, `<ENV_VAR>`, and `<VALUE>` with the actual values:

```bash
curl -s -X POST http://localhost:${PORT:-8080}/api/config/patch \
  -H "Content-Type: application/json" \
  -d "{
    \"baseHash\": \"$HASH\",
    \"raw\": \"{ \\\"skills\\\": { \\\"entries\\\": { \\\"<SKILL_KEY>\\\": { \\\"env\\\": { \\\"<ENV_VAR>\\\": \\\"<VALUE>\\\" } } } } }\"
  }"
```

The gateway will merge the patch, validate the config, persist it, and restart automatically.

### Example — Setting the Notion API Key

```bash
CONFIG_JSON=$(curl -s -X POST http://localhost:${PORT:-8080}/api/config/get \
  -H "Content-Type: application/json" -d '{}')
HASH=$(echo "$CONFIG_JSON" | jq -r '.hash')

curl -s -X POST http://localhost:${PORT:-8080}/api/config/patch \
  -H "Content-Type: application/json" \
  -d "{
    \"baseHash\": \"$HASH\",
    \"raw\": \"{ \\\"skills\\\": { \\\"entries\\\": { \\\"notion\\\": { \\\"env\\\": { \\\"NOTION_API_KEY\\\": \\\"secret_abc123\\\" } } } } }\"
  }"
```

## Important Notes

- **Never echo or log the API key value.** Always use variables.
- After setting a key, confirm by telling the user the skill is now configured.
- If the user just asks "what keys do I need?", show the table above.
- The user can also configure keys via the **Skills** section in the sidebar dashboard (click the key icon on any skill).
- If `OPENAI_API_KEY` was already configured as a model provider key, it is shared automatically with skills that need it — no need to set it again via this method.
