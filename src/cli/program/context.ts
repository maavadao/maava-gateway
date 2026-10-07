import { VERSION } from "../../version.ts";
import { resolveCliChannelOptions } from "../channel-options.ts";

export type ProgramContext = {
  programVersion: string;
  channelOptions: string[];
  messageChannelOptions: string;
  agentChannelOptions: string;
};

export function createProgramContext(): ProgramContext {
  const channelOptions = resolveCliChannelOptions();
  return {
    programVersion: VERSION,
    channelOptions,
    messageChannelOptions: channelOptions.join("|"),
    agentChannelOptions: ["last", ...channelOptions].join("|"),
  };
}
