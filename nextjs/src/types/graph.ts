export type MetricType = "depth" | "temperature" | "cns" | "ndl" | "n2Loading" | "o2Tox" | "rmvLiters" | "gasO2" | "gasN2" | "gasHe";

export type MetricConfig = {
  show: boolean;
  color: string;
};

export type DataPoint = {
  time: number;
  depth: number;
  temperature: number;
  temperatureUnit: "CELSIUS" | "KELVIN";
  cns?: number;
  ndl?: string;
  n2Loading?: number;
  o2Tox?: number;
  rmvLiters?: number;
  gasO2?: number;
  gasN2?: number;
  gasHe?: number;
  profileId: number;
};

export type TooltipData = {
  x: number;
  y: number;
  time: number;
  depth: number;
  temperature: number;
  temperatureUnit: "CELSIUS" | "KELVIN";
  cns?: number;
  ndl?: string;
  n2Loading?: number;
  o2Tox?: number;
  rmvLiters?: number;
  gasO2?: number;
  gasN2?: number;
  gasHe?: number;
  startTime: number;
  segmentType?: string;
} | null;

export const DEFAULT_METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
  depth: { show: true, color: "#9CA3AF" },
  temperature: { show: true, color: "#2563eb" },
  cns: { show: false, color: "#fbbf24" },
  ndl: { show: false, color: "#991b1b" },
  n2Loading: { show: false, color: "#8b5cf6" },
  o2Tox: { show: false, color: "#ec4899" },
  rmvLiters: { show: false, color: "#14b8a6" },
  gasO2: { show: false, color: "#06b6d4" },
  gasN2: { show: false, color: "#84cc16" },
  gasHe: { show: false, color: "#f97316" },
};

export const metricLabels: Record<MetricType, string> = {
  depth: "Depth (m)",
  temperature: "Temperature",
  cns: "CNS (%)",
  ndl: "NDL (min)",
  n2Loading: "GF99 (%)",
  o2Tox: "OTUs",
  rmvLiters: "RMV (L/min)",
  gasO2: "Gas O2 (%)",
  gasN2: "Gas N2 (%)",
  gasHe: "Gas He (%)",
};

export const metricDisplayNames: Record<MetricType, string> = {
  depth: "Depth",
  temperature: "Temperature",
  cns: "CNS",
  ndl: "NDL",
  n2Loading: "GF99",
  o2Tox: "OTUs",
  rmvLiters: "RMV",
  gasO2: "Gas O2",
  gasN2: "Gas N2",
  gasHe: "Gas He",
};
