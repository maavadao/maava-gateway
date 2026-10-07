import { LEGACY_CONFIG_MIGRATIONS_PART_1 } from "./legacy.migrations.part-1.ts";
import { LEGACY_CONFIG_MIGRATIONS_PART_2 } from "./legacy.migrations.part-2.ts";
import { LEGACY_CONFIG_MIGRATIONS_PART_3 } from "./legacy.migrations.part-3.ts";

export const LEGACY_CONFIG_MIGRATIONS = [
  ...LEGACY_CONFIG_MIGRATIONS_PART_1,
  ...LEGACY_CONFIG_MIGRATIONS_PART_2,
  ...LEGACY_CONFIG_MIGRATIONS_PART_3,
];
