import * as d3 from "d3";
import { MetricType } from "../../../types/graph";

export const formatElapsedTime = (timestamp: number, startTime: number) => {
  const elapsedMs = timestamp - startTime;
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const formatTemperatureUnit = (unit: "CELSIUS" | "KELVIN") => {
  return unit === "CELSIUS" ? "°C" : "K";
};

export const formatTemperature = (temp: number, unit: "CELSIUS" | "KELVIN") => {
  return `${temp.toFixed(1)}${formatTemperatureUnit(unit)}`;
};

export const formatDepth = (depth: number) => {
  return `${depth.toFixed(2)}m`;
};

export const formatCns = (cns: number) => {
  return `${cns.toFixed(1)}%`;
};

export const parseIsoDuration = (duration: string | undefined | null): number => {
  // Parse ISO 8601 duration like PT3H20M to minutes
  if (!duration || typeof duration !== "string") return 0;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/u;
  const matches = regex.exec(duration);
  if (!matches) return 0;
  const hours = Number.parseInt(matches[1] || "0", 10);
  const minutes = Number.parseInt(matches[2] || "0", 10);
  const seconds = Number.parseInt(matches[3] || "0", 10);
  return hours * 60 + minutes + seconds / 60;
};

export const formatNdl = (ndl: string) => {
  const minutes = parseIsoDuration(ndl);
  return `${Math.floor(minutes)}min`;
};

export const formatN2Loading = (n2: number) => {
  return `${n2.toFixed(1)}%`;
};

export const formatO2Tox = (o2Tox: number) => {
  return `${o2Tox.toFixed(1)}%`;
};

export const formatRmvLiters = (rmv: number) => {
  return `${rmv.toFixed(2)}L/min`;
};

export const formatGasPercentage = (percentage: number) => {
  return `${percentage.toFixed(1)}%`;
};

export function formatAxisTick(d: d3.NumberValue, metric: MetricType): string {
  switch (metric) {
    case "depth":
      return `${Number(d)}`;
    case "temperature":
      return `${Number(d)}`;
    case "cns":
      return `${Number(d)}`;
    case "ndl":
      return `${Math.floor(Number(d))}`;
    default:
      return `${Number(d)}`;
  }
}

export function isFieldVisible(value: number | string | undefined | null): boolean {
  return value !== undefined && value !== null && value !== "";
}
