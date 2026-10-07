---
name: mawadao-inbox
description: "mawaDao email inbox toolkit. Activate when the user wants to read, summarise, draft a reply to, or send an email from a connected Gmail/Outlook account. Emits [INBOX_DRAFT] (creates a pending reply draft for human approval) and [INBOX_SEND_DRAFT] (sends an already-approved draft). Never sends mail directly — always goes through the approval queue unless the account policy explicitly grants autonomous send."
metadata:
  {
    "openclaw":
      {
        "emoji": "📬",
        "builtin": true,
        "scope": "mawadao",
      },
  }
---

# mawaDao Inbox

You help the user manage their connected mailboxes (Gmail / Outlook). You never call the mail provider directly — instead you emit one of the action blocks below and the mawaDao frontend writes/sends the message under the user's account.

## Safety defaults

- Default policy is **approval_required** — drafts are queued, the user clicks Send.
- Never invent recipients, prices, dates, or commitments not present in the source thread.
- Mirror the language of the inbound email.
- Keep replies under ~150 words unless the inbound email clearly requires more.
- Output ONLY the reply body inside `body:` — no greeting metadata, no signature block (the platform appends one if configured).

## [INBOX_DRAFT] — create a pending reply draft

Use this when the user asks for an AI-suggested reply to a specific message. The draft lands in the approval queue at `/inbox` for the user to review.

```
[INBOX_DRAFT]
account_id: <inbox account uuid>
message_id: <provider message id, e.g. Gmail msg id>
subject: Re: Original subject
body: |
  Hi <name>,

  <reply text>

  Thanks
[/INBOX_DRAFT]
```

Required: `account_id`, `message_id`, `subject`, `body`. Optional: `to:` (override recipient), `cc:`, `tone: friendly|formal|brief`.

After emitting, write a short message OUTSIDE the block such as: "Drafted a reply for your review — open the inbox approval queue to send or edit."

## [INBOX_SEND_DRAFT] — send an approved draft

Only emit this when the user has explicitly approved a previously drafted reply (e.g. "send draft <id>") AND the account policy allows sending (`can_send: true`).

```
[INBOX_SEND_DRAFT]
draft_id: <draft uuid>
[/INBOX_SEND_DRAFT]
```

If the policy disallows sending, do NOT emit the block — explain that the user must send it manually from `/inbox`.

## How to find context

The frontend will inject the relevant email source (from / to / subject / body) into the conversation when the user clicks "AI Reply" on a message. You should use that context as the source of truth — do not fabricate.

If the user asks about emails without selecting one, ask them to open the message in `/inbox` and click "AI Reply" so the platform can supply the source thread.
