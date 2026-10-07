import type { ModelCatalogEntry } from "../../agents/model-catalog.ts";
import type { createDefaultDeps } from "../../cli/deps.ts";
import type { HealthSummary } from "../../commands/health.ts";
import type { CronService } from "../../cron/service.ts";
import type { createSubsystemLogger } from "../../logging/subsystem.ts";
import type { WizardSession } from "../../wizard/session.ts";
import type { ChatAbortControllerEntry } from "../chat-abort.ts";
import type { NodeRegistry } from "../node-registry.ts";
import type { ConnectParams, ErrorShape, RequestFrame } from "../protocol/index.ts";
import type { ChannelRuntimeSnapshot } from "../server-channels.ts";
import type { DedupeEntry } from "../server-shared.ts";

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

export type GatewayClient = {
  connect: ConnectParams;
};

export type RespondFn = (
  ok: boolean,
  payload?: unknown,
  error?: ErrorShape,
  meta?: Record<string, unknown>,
) => void;

export type GatewayRequestContext = {
  deps: ReturnType<typeof createDefaultDeps>;
  cron: CronService;
  cronStorePath: string;
  loadGatewayModelCatalog: () => Promise<ModelCatalogEntry[]>;
  getHealthCache: () => HealthSummary | null;
  refreshHealthSnapshot: (opts?: { probe?: boolean }) => Promise<HealthSummary>;
  logHealth: { error: (message: string) => void };
  logGateway: SubsystemLogger;
  incrementPresenceVersion: () => number;
  getHealthVersion: () => number;
  broadcast: (
    event: string,
    payload: unknown,
    opts?: {
      dropIfSlow?: boolean;
      stateVersion?: { presence?: number; health?: number };
    },
  ) => void;
  nodeSendToSession: (sessionKey: string, event: string, payload: unknown) => void;
  nodeSendToAllSubscribed: (event: string, payload: unknown) => void;
  nodeSubscribe: (nodeId: string, sessionKey: string) => void;
  nodeUnsubscribe: (nodeId: string, sessionKey: string) => void;
  nodeUnsubscribeAll: (nodeId: string) => void;
  hasConnectedMobileNode: () => boolean;
  nodeRegistry: NodeRegistry;
  agentRunSeq: Map<string, number>;
  chatAbortControllers: Map<string, ChatAbortControllerEntry>;
  chatAbortedRuns: Map<string, number>;
  chatRunBuffers: Map<string, string>;
  chatDeltaSentAt: Map<string, number>;
  addChatRun: (sessionId: string, entry: { sessionKey: string; clientRunId: string }) => void;
  removeChatRun: (
    sessionId: string,
    clientRunId: string,
    sessionKey?: string,
  ) => { sessionKey: string; clientRunId: string } | undefined;
  dedupe: Map<string, DedupeEntry>;
  wizardSessions: Map<string, WizardSession>;
  findRunningWizard: () => string | null;
  purgeWizardSession: (id: string) => void;
  getRuntimeSnapshot: () => ChannelRuntimeSnapshot;
  startChannel: (
    channel: import("../../channels/plugins/types.ts").ChannelId,
    accountId?: string,
  ) => Promise<void>;
  stopChannel: (
    channel: import("../../channels/plugins/types.ts").ChannelId,
    accountId?: string,
  ) => Promise<void>;
  markChannelLoggedOut: (
    channelId: import("../../channels/plugins/types.ts").ChannelId,
    cleared: boolean,
    accountId?: string,
  ) => void;
  wizardRunner: (
    opts: import("../../commands/onboard-types.ts").OnboardOptions,
    runtime: import("../../runtime.ts").RuntimeEnv,
    prompter: import("../../wizard/prompts.ts").WizardPrompter,
  ) => Promise<void>;
  broadcastVoiceWakeChanged: (triggers: string[]) => void;
};

export type GatewayRequestOptions = {
  req: RequestFrame;
  client: GatewayClient | null;
  isWebchatConnect: (params: ConnectParams | null | undefined) => boolean;
  respond: RespondFn;
  context: GatewayRequestContext;
};

export type GatewayRequestHandlerOptions = {
  req: RequestFrame;
  params: Record<string, unknown>;
  client: GatewayClient | null;
  isWebchatConnect: (params: ConnectParams | null | undefined) => boolean;
  respond: RespondFn;
  context: GatewayRequestContext;
};

export type GatewayRequestHandler = (opts: GatewayRequestHandlerOptions) => Promise<void> | void;

export type GatewayRequestHandlers = Record<string, GatewayRequestHandler>;
