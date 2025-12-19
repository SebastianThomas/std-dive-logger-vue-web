import { MetricConfig, MetricType, TooltipData } from "../../../types/graph";
import {
  formatCns,
  formatDepth,
  formatElapsedTime,
  formatGasPercentage,
  formatN2Loading,
  formatNdl,
  formatO2Tox,
  formatRmvLiters,
  formatTemperature,
  isFieldVisible,
} from "./formatting";

function calculateTooltipPosition(
  tooltip: Exclude<TooltipData, null>,
  width: number,
  estimatedHeight: number
): { left: number; top: number } {
  const tooltipWidth = 150;
  const viewportHeight = globalThis.window === undefined ? 800 : globalThis.window.innerHeight;

  return {
    left: tooltip.x + 10 + tooltipWidth > width ? tooltip.x - tooltipWidth - 10 : tooltip.x + 10,
    top: tooltip.y + 10 + estimatedHeight > viewportHeight ? tooltip.y - estimatedHeight - 10 : tooltip.y + 10,
  };
}

function calculateTooltipHeight(
  tooltip: Exclude<TooltipData, null>,
  metricConfigs: Record<MetricType, MetricConfig>
): number {
  const visibleFieldCount = [
    metricConfigs.depth.show && isFieldVisible(tooltip.depth),
    metricConfigs.temperature.show && isFieldVisible(tooltip.temperature),
    metricConfigs.cns.show && isFieldVisible(tooltip.cns),
    metricConfigs.ndl.show && isFieldVisible(tooltip.ndl),
    metricConfigs.n2Loading.show && isFieldVisible(tooltip.n2Loading),
    metricConfigs.o2Tox.show && isFieldVisible(tooltip.o2Tox),
    metricConfigs.rmvLiters.show && isFieldVisible(tooltip.rmvLiters),
    metricConfigs.gasO2.show && isFieldVisible(tooltip.gasO2),
    metricConfigs.gasN2.show && isFieldVisible(tooltip.gasN2),
    metricConfigs.gasHe.show && isFieldVisible(tooltip.gasHe),
  ].filter(Boolean).length;

  return 20 + visibleFieldCount * 20 + 20;
}

export function DiveTooltip({
  tooltip,
  width,
  metricConfigs,
}: Readonly<{
  tooltip: TooltipData;
  width: number;
  metricConfigs: Record<MetricType, MetricConfig>;
}>) {
  if (!tooltip) return null;

  const estimatedHeight = calculateTooltipHeight(tooltip, metricConfigs);
  const { left, top } = calculateTooltipPosition(tooltip, width, estimatedHeight);

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "4px",
        fontSize: "14px",
        pointerEvents: "none",
        zIndex: 1000,
        whiteSpace: "nowrap",
      }}
    >
      <DiveTooltipContent tooltip={tooltip} metricConfigs={metricConfigs} />
    </div>
  );
}

export function DiveTooltipContent({
  tooltip,
  metricConfigs,
}: Readonly<{
  tooltip: Exclude<TooltipData, null>;
  metricConfigs: Record<MetricType, MetricConfig>;
}>) {
  return (
    <>
      <div>
        <strong>Time:</strong> {formatElapsedTime(tooltip.time, tooltip.startTime)}
      </div>
      {tooltip.segmentType && (
        <div>
          <strong>Segment:</strong> {tooltip.segmentType}
        </div>
      )}
      {metricConfigs.depth.show && tooltip.depth !== undefined && tooltip.depth !== null && (
        <div>
          <strong>Depth:</strong> {formatDepth(tooltip.depth)}
        </div>
      )}
      {metricConfigs.temperature.show && tooltip.temperature !== undefined && tooltip.temperature !== null && (
        <div>
          <strong>Temperature:</strong> {formatTemperature(tooltip.temperature, tooltip.temperatureUnit)}
        </div>
      )}
      {metricConfigs.cns.show && tooltip.cns !== undefined && tooltip.cns !== null && (
        <div>
          <strong>CNS:</strong> {formatCns(tooltip.cns)}
        </div>
      )}
      {metricConfigs.ndl.show &&
        tooltip.ndl !== undefined &&
        tooltip.ndl !== null &&
        tooltip.ndl !== "" && (
          <div>
            <strong>NDL:</strong> {formatNdl(tooltip.ndl)}
          </div>
        )}
      {metricConfigs.n2Loading.show && tooltip.n2Loading !== undefined && tooltip.n2Loading !== null && (
        <div>
          <strong>GF99:</strong> {formatN2Loading(tooltip.n2Loading)}
        </div>
      )}
      {metricConfigs.o2Tox.show && tooltip.o2Tox !== undefined && tooltip.o2Tox !== null && (
        <div>
          <strong>OTUs:</strong> {formatO2Tox(tooltip.o2Tox)}
        </div>
      )}
      {metricConfigs.rmvLiters.show && tooltip.rmvLiters !== undefined && tooltip.rmvLiters !== null && (
        <div>
          <strong>RMV:</strong> {formatRmvLiters(tooltip.rmvLiters)}
        </div>
      )}
      {metricConfigs.gasO2.show && tooltip.gasO2 !== undefined && tooltip.gasO2 !== null && (
        <div>
          <strong>Gas O2:</strong> {formatGasPercentage(tooltip.gasO2)}
        </div>
      )}
      {metricConfigs.gasN2.show && tooltip.gasN2 !== undefined && tooltip.gasN2 !== null && (
        <div>
          <strong>Gas N2:</strong> {formatGasPercentage(tooltip.gasN2)}
        </div>
      )}
      {metricConfigs.gasHe.show && tooltip.gasHe !== undefined && tooltip.gasHe !== null && (
        <div>
          <strong>Gas He:</strong> {formatGasPercentage(tooltip.gasHe)}
        </div>
      )}
    </>
  );
}
