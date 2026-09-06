import type { ProviderId } from "./usage"
export type StripPreferences = {
  density: "compact" | "comfortable"
  foldDelay: number
  orderedProviders: ProviderId[]
  hiddenProviders: ProviderId[]
  hiddenUntil: number | null
}
export const defaultStripPreferences: StripPreferences = {
  density: "compact", foldDelay: 0,
  orderedProviders: ["claude", "codex", "deepseek"], hiddenProviders: [], hiddenUntil: null,
}
