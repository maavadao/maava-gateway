import type { ChannelOutboundAdapter } from "../types.ts";
import { chunkMarkdownText } from "../../../auto-reply/chunk.ts";
import { getFeishuClient } from "../../../feishu/client.ts";
import { sendMessageFeishu } from "../../../feishu/send.ts";

function resolveReceiveIdType(target: string): "open_id" | "union_id" | "chat_id" {
  const trimmed = target.trim().toLowerCase();
  if (trimmed.startsWith("ou_")) {
    return "open_id";
  }
  if (trimmed.startsWith("on_")) {
    return "union_id";
  }
  return "chat_id";
}

export const feishuOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: (text, limit) => chunkMarkdownText(text, limit),
  chunkerMode: "markdown",
  textChunkLimit: 2000,
  sendText: async ({ to, text, accountId }) => {
    const client = getFeishuClient(accountId ?? undefined);
    const result = await sendMessageFeishu(
      client,
      to,
      { text },
      {
        receiveIdType: resolveReceiveIdType(to),
      },
    );
    return {
      channel: "feishu",
      messageId: result?.message_id || "unknown",
      chatId: to,
    };
  },
  sendMedia: async ({ to, text, mediaUrl, accountId }) => {
    const client = getFeishuClient(accountId ?? undefined);
    const result = await sendMessageFeishu(
      client,
      to,
      { text: text || "" },
      { mediaUrl, receiveIdType: resolveReceiveIdType(to) },
    );
    return {
      channel: "feishu",
      messageId: result?.message_id || "unknown",
      chatId: to,
    };
  },
};
