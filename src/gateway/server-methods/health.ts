import type { GatewayRequestHandlers } from "./types.ts";
import { getStatusSummary } from "../../commands/status.ts";
import { ErrorCodes, errorShape } from "../protocol/index.ts";
import { HEALTH_REFRESH_INTERVAL_MS } from "../server-constants.ts";
import { formatError } from "../server-utils.ts";
import { formatForLog } from "../ws-log.ts";

export const healthHandlers: GatewayRequestHandlers = {
  health: async ({ respond, context, params }) => {
    const { getHealthCache, refreshHealthSnapshot, logHealth } = context;
    const wantsProbe = params?.probe === true;
    const now = Date.now();
    const cached = getHealthCache();
    if (!wantsProbe && cached && now - cached.ts < HEALTH_REFRESH_INTERVAL_MS) {
      respond(true, cached, undefined, { cached: true });
      void refreshHealthSnapshot({ probe: false }).catch((err) =>
        logHealth.error(`background health refresh failed: ${formatError(err)}`),
      );
      return;
    }
    try {
      const snap = await refreshHealthSnapshot({ probe: wantsProbe });
      respond(true, snap, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
  status: async ({ respond }) => {
    const status = await getStatusSummary();
    respond(true, status, undefined);
  },
};
