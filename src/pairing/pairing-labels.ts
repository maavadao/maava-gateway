import type { PairingChannel } from "./pairing-store.ts";
import { getPairingAdapter } from "../channels/plugins/pairing.ts";

export function resolvePairingIdLabel(channel: PairingChannel): string {
  return getPairingAdapter(channel)?.idLabel ?? "userId";
}
