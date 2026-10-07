import type { Command } from "commander";
import type { OpenClawConfig } from "../../config/config.ts";
import { isTruthyEnvValue } from "../../infra/env.ts";
import { buildParseArgv, getPrimaryCommand, hasHelpOrVersion } from "../argv.ts";
import { resolveActionArgs } from "./helpers.ts";

type SubCliRegistrar = (program: Command) => Promise<void> | void;

type SubCliEntry = {
  name: string;
  description: string;
  register: SubCliRegistrar;
};

const shouldRegisterPrimaryOnly = (argv: string[]) => {
  if (isTruthyEnvValue(process.env.OPENCLAW_DISABLE_LAZY_SUBCOMMANDS)) {
    return false;
  }
  if (hasHelpOrVersion(argv)) {
    return false;
  }
  return true;
};

const shouldEagerRegisterSubcommands = (_argv: string[]) => {
  return isTruthyEnvValue(process.env.OPENCLAW_DISABLE_LAZY_SUBCOMMANDS);
};

const loadConfig = async (): Promise<OpenClawConfig> => {
  const mod = await import("../../config/config.ts");
  return mod.loadConfig();
};

const entries: SubCliEntry[] = [
  {
    name: "acp",
    description: "Agent Control Protocol tools",
    register: async (program) => {
      const mod = await import("../acp-cli.ts");
      mod.registerAcpCli(program);
    },
  },
  {
    name: "gateway",
    description: "Gateway control",
    register: async (program) => {
      const mod = await import("../gateway-cli.ts");
      mod.registerGatewayCli(program);
    },
  },
  {
    name: "daemon",
    description: "Gateway service (legacy alias)",
    register: async (program) => {
      const mod = await import("../daemon-cli.ts");
      mod.registerDaemonCli(program);
    },
  },
  {
    name: "logs",
    description: "Gateway logs",
    register: async (program) => {
      const mod = await import("../logs-cli.ts");
      mod.registerLogsCli(program);
    },
  },
  {
    name: "system",
    description: "System events, heartbeat, and presence",
    register: async (program) => {
      const mod = await import("../system-cli.ts");
      mod.registerSystemCli(program);
    },
  },
  {
    name: "models",
    description: "Model configuration",
    register: async (program) => {
      const mod = await import("../models-cli.ts");
      mod.registerModelsCli(program);
    },
  },
  {
    name: "approvals",
    description: "Exec approvals",
    register: async (program) => {
      const mod = await import("../exec-approvals-cli.ts");
      mod.registerExecApprovalsCli(program);
    },
  },
  {
    name: "nodes",
    description: "Node commands",
    register: async (program) => {
      const mod = await import("../nodes-cli.ts");
      mod.registerNodesCli(program);
    },
  },
  {
    name: "devices",
    description: "Device pairing + token management",
    register: async (program) => {
      const mod = await import("../devices-cli.ts");
      mod.registerDevicesCli(program);
    },
  },
  {
    name: "node",
    description: "Node control",
    register: async (program) => {
      const mod = await import("../node-cli.ts");
      mod.registerNodeCli(program);
    },
  },
  {
    name: "sandbox",
    description: "Sandbox tools",
    register: async (program) => {
      const mod = await import("../sandbox-cli.ts");
      mod.registerSandboxCli(program);
    },
  },
  {
    name: "tui",
    description: "Terminal UI",
    register: async (program) => {
      const mod = await import("../tui-cli.ts");
      mod.registerTuiCli(program);
    },
  },
  {
    name: "cron",
    description: "Cron scheduler",
    register: async (program) => {
      const mod = await import("../cron-cli.ts");
      mod.registerCronCli(program);
    },
  },
  {
    name: "dns",
    description: "DNS helpers",
    register: async (program) => {
      const mod = await import("../dns-cli.ts");
      mod.registerDnsCli(program);
    },
  },
  {
    name: "docs",
    description: "Docs helpers",
    register: async (program) => {
      const mod = await import("../docs-cli.ts");
      mod.registerDocsCli(program);
    },
  },
  {
    name: "hooks",
    description: "Hooks tooling",
    register: async (program) => {
      const mod = await import("../hooks-cli.ts");
      mod.registerHooksCli(program);
    },
  },
  {
    name: "webhooks",
    description: "Webhook helpers",
    register: async (program) => {
      const mod = await import("../webhooks-cli.ts");
      mod.registerWebhooksCli(program);
    },
  },
  {
    name: "pairing",
    description: "Pairing helpers",
    register: async (program) => {
      // Initialize plugins before registering pairing CLI.
      // The pairing CLI calls listPairingChannels() at registration time,
      // which requires the plugin registry to be populated with channel plugins.
      const { registerPluginCliCommands } = await import("../../plugins/cli.ts");
      registerPluginCliCommands(program, await loadConfig());
      const mod = await import("../pairing-cli.ts");
      mod.registerPairingCli(program);
    },
  },
  {
    name: "plugins",
    description: "Plugin management",
    register: async (program) => {
      const mod = await import("../plugins-cli.ts");
      mod.registerPluginsCli(program);
      const { registerPluginCliCommands } = await import("../../plugins/cli.ts");
      registerPluginCliCommands(program, await loadConfig());
    },
  },
  {
    name: "channels",
    description: "Channel management",
    register: async (program) => {
      const mod = await import("../channels-cli.ts");
      mod.registerChannelsCli(program);
    },
  },
  {
    name: "directory",
    description: "Directory commands",
    register: async (program) => {
      const mod = await import("../directory-cli.ts");
      mod.registerDirectoryCli(program);
    },
  },
  {
    name: "security",
    description: "Security helpers",
    register: async (program) => {
      const mod = await import("../security-cli.ts");
      mod.registerSecurityCli(program);
    },
  },
  {
    name: "skills",
    description: "Skills management",
    register: async (program) => {
      const mod = await import("../skills-cli.ts");
      mod.registerSkillsCli(program);
    },
  },
  {
    name: "update",
    description: "CLI update helpers",
    register: async (program) => {
      const mod = await import("../update-cli.ts");
      mod.registerUpdateCli(program);
    },
  },
  {
    name: "completion",
    description: "Generate shell completion script",
    register: async (program) => {
      const mod = await import("../completion-cli.ts");
      mod.registerCompletionCli(program);
    },
  },
];

export function getSubCliEntries(): SubCliEntry[] {
  return entries;
}

function removeCommand(program: Command, command: Command) {
  const commands = program.commands as Command[];
  const index = commands.indexOf(command);
  if (index >= 0) {
    commands.splice(index, 1);
  }
}

export async function registerSubCliByName(program: Command, name: string): Promise<boolean> {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) {
    return false;
  }
  const existing = program.commands.find((cmd) => cmd.name() === entry.name);
  if (existing) {
    removeCommand(program, existing);
  }
  await entry.register(program);
  return true;
}

function registerLazyCommand(program: Command, entry: SubCliEntry) {
  const placeholder = program.command(entry.name).description(entry.description);
  placeholder.allowUnknownOption(true);
  placeholder.allowExcessArguments(true);
  placeholder.action(async (...actionArgs) => {
    removeCommand(program, placeholder);
    await entry.register(program);
    const actionCommand = actionArgs.at(-1) as Command | undefined;
    const root = actionCommand?.parent ?? program;
    const rawArgs = (root as Command & { rawArgs?: string[] }).rawArgs;
    const actionArgsList = resolveActionArgs(actionCommand);
    const fallbackArgv = actionCommand?.name()
      ? [actionCommand.name(), ...actionArgsList]
      : actionArgsList;
    const parseArgv = buildParseArgv({
      programName: program.name(),
      rawArgs,
      fallbackArgv,
    });
    await program.parseAsync(parseArgv);
  });
}

export function registerSubCliCommands(program: Command, argv: string[] = process.argv) {
  if (shouldEagerRegisterSubcommands(argv)) {
    for (const entry of entries) {
      void entry.register(program);
    }
    return;
  }
  const primary = getPrimaryCommand(argv);
  if (primary && shouldRegisterPrimaryOnly(argv)) {
    const entry = entries.find((candidate) => candidate.name === primary);
    if (entry) {
      registerLazyCommand(program, entry);
      return;
    }
  }
  for (const candidate of entries) {
    registerLazyCommand(program, candidate);
  }
}
