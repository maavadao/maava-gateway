// Barrel exports for the web channel pieces. Splitting the original 900+ line
// module keeps responsibilities small and testable.
export {
  DEFAULT_WEB_MEDIA_BYTES,
  HEARTBEAT_PROMPT,
  HEARTBEAT_TOKEN,
  monitorWebChannel,
  resolveHeartbeatRecipients,
  runWebHeartbeatOnce,
  type WebChannelStatus,
  type WebMonitorTuning,
} from "./web/auto-reply.ts";
export {
  extractMediaPlaceholder,
  extractText,
  monitorWebInbox,
  type WebInboundMessage,
  type WebListenerCloseReason,
} from "./web/inbound.ts";
export { loginWeb } from "./web/login.ts";
export { loadWebMedia, optimizeImageToJpeg } from "./web/media.ts";
export { sendMessageWhatsApp } from "./web/outbound.ts";
export {
  createWaSocket,
  formatError,
  getStatusCode,
  logoutWeb,
  logWebSelfId,
  pickWebChannel,
  WA_WEB_AUTH_DIR,
  waitForWaConnection,
  webAuthExists,
} from "./web/session.ts";
