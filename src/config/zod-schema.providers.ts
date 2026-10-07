import { z } from "zod";
import { ChannelHeartbeatVisibilitySchema } from "./zod-schema.channels.ts";
import { GroupPolicySchema } from "./zod-schema.core.ts";
import {
  BlueBubblesConfigSchema,
  DiscordConfigSchema,
  GoogleChatConfigSchema,
  IMessageConfigSchema,
  MSTeamsConfigSchema,
  SignalConfigSchema,
  SlackConfigSchema,
  TelegramConfigSchema,
} from "./zod-schema.providers-core.ts";
import { WhatsAppConfigSchema } from "./zod-schema.providers-whatsapp.ts";

export * from "./zod-schema.providers-core.ts";
export * from "./zod-schema.providers-whatsapp.ts";
export { ChannelHeartbeatVisibilitySchema } from "./zod-schema.channels.ts";

export const ChannelsSchema = z
  .object({
    defaults: z
      .object({
        groupPolicy: GroupPolicySchema.optional(),
        heartbeat: ChannelHeartbeatVisibilitySchema,
      })
      .strict()
      .optional(),
    whatsapp: WhatsAppConfigSchema.optional(),
    telegram: TelegramConfigSchema.optional(),
    discord: DiscordConfigSchema.optional(),
    googlechat: GoogleChatConfigSchema.optional(),
    slack: SlackConfigSchema.optional(),
    signal: SignalConfigSchema.optional(),
    imessage: IMessageConfigSchema.optional(),
    bluebubbles: BlueBubblesConfigSchema.optional(),
    msteams: MSTeamsConfigSchema.optional(),
  })
  .passthrough() // Allow extension channel configs (nostr, matrix, zalo, etc.)
  .optional();
