/**
 * DiveGraph - Modular dive profile visualization component
 *
 * This component has been refactored to improve maintainability and extensibility.
 * The implementation is now split across several files:
 * - @/types/graph.ts: Type definitions and constants
 * - formatting.ts: Formatting utilities
 * - MetricsControlPanel.tsx: Metric selection UI
 * - DiveTooltip.tsx: Tooltip components
 * - @/hooks/useDiveSegments.ts: Segment data fetching hook
 *
 * For the original monolithic implementation, see git history.
 */

import { useDiveProfileSegments } from "@/hooks/useDiveSegments";
import {
  Dive,
  DiveProfile,
  DiveProfileSegmentType,
  DiveProfileSegmentWithId
} from "@/types/dive";
import { JsonViewer } from "@textea/json-viewer";
import * as d3 from "d3";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DataPoint,
  DEFAULT_METRIC_CONFIGS,
  MetricConfig,
  metricLabels,
  MetricType,
  TooltipData,
} from "../../../types/graph";
import { DiveTooltip } from "./DiveTooltip";
import {
  formatAxisTick,
  formatTemperatureUnit,
  parseIsoDuration,
} from "./formatting";
import { MetricsControlPanel } from "./MetricsControlPanel";

export default function DiveGraph({
  dive,
  variant = "normal",
}: Readonly<{ dive: Dive; variant?: "compact" | "normal" | "fullscreen" }>) {
  const [shouldFetchSegments, setShouldFetchSegments] = useState(false);
  const { segments, loading: segmentsLoading } = useDiveProfileSegments(
    dive.id,
    shouldFetchSegments
  );

  return (
    <div>
      <LinePlot
        profiles={dive.profiles}
        segments={segments}
        segmentsLoading={segmentsLoading}
        onRequestSegments={() => setShouldFetchSegments(true)}
        variant={variant} />
    </div>
  );
}

export function LinePlot({
  profiles,
  segments,
  segmentsLoading,
  onRequestSegments,
  variant = "normal",
  marginTop = 20,
  marginRight = 40,
  marginBottom = 30,
  marginLeft = 40,
}: Readonly<{
  profiles: DiveProfile[];
  segments?: DiveProfileSegmentWithId[] | null;
  segmentsLoading?: boolean;
  onRequestSegments?: () => void;
  variant?: "compact" | "normal" | "fullscreen";
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}>) {
  const gx = useRef<SVGGElement>(null);
  const gyLeft = useRef<SVGGElement>(null);
  const gyRight = useRef<SVGGElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const interactiveRectRef = useRef<SVGRectElement>(null);
  const configLoadedRef = useRef(false);
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 400 });

  const [metricConfigs, setMetricConfigs] = useState<
    Record<MetricType, MetricConfig>
  >(() => ({
    ...DEFAULT_METRIC_CONFIGS,
  }));

  const [leftAxisMetric, setLeftAxisMetric] = useState<MetricType | null>(
    "depth"
  );
  const [rightAxisMetric, setRightAxisMetric] = useState<MetricType | null>(
    "temperature"
  );
  const [showSegments, setShowSegments] = useState(false);

  // Request segments when showSegments becomes true for the first time
  useEffect(() => {
    if (showSegments && onRequestSegments) {
      onRequestSegments();
    }
  }, [showSegments, onRequestSegments]);

  // Responsive dimensions
  useEffect(() => {
    const w = globalThis;
    const updateDimensions = () => {

      if (!svgContainerRef.current) return;

      const containerWidth = svgContainerRef.current.offsetWidth || 640;
      console.log(`Container Width: ${svgContainerRef.current.offsetWidth}`)
      const viewportHeight =
        w == undefined ? 800 : w.innerHeight;

      const width = Math.min(containerWidth, 1500);
      let height: number;

      switch (variant) {
        case "compact":
          height = Math.max(220, width * 0.45);
          break;

        case "fullscreen":
          height = Math.max(
            300,
            Math.floor(viewportHeight * 0.7)
          );
          break;

        default:
          height = Math.max(280, width * 0.6);
      }

      setDimensions({ width, height });
    };

    updateDimensions();

    if (w == undefined) return;

    const observer =
      typeof w.ResizeObserver === "function" && svgContainerRef.current
        ? new ResizeObserver(updateDimensions)
        : null;

    if (observer && svgContainerRef.current) {
      observer.observe(svgContainerRef.current);
      window.addEventListener("resize", updateDimensions);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateDimensions);
      };
    }

    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [variant]);

  const { width, height } = dimensions;

  // Process data
  const data: DataPoint[] = profiles.flatMap((profile) =>
    profile.measurements.map((m) => ({
      time: m.measurement.time,
      depth: m.measurement.depth,
      temperature: m.measurement.temperature.value,
      temperatureUnit: m.measurement.temperature.unit,
      cns: m.measurement.cns,
      ndl: m.measurement.ndl,
      n2Loading: m.measurement.n2,
      o2Tox: m.measurement.o2Tox,
      rmvLiters: m.measurement.rmvLiters,
      gasO2: m.measurement.gas?.o2,
      gasN2: m.measurement.gas?.n2,
      gasHe: m.measurement.gas?.he,
      profileId: profile.id,
    }))
  );

  data.sort((a, b) => a.time - b.time);

  const metricHasData = useCallback((metric: MetricType): boolean => {
    return data.some((d) => {
      const value = d[metric as keyof DataPoint];
      return value !== undefined && value !== null && value !== "";
    });
  }, [data]);

  const getTemperatureLabel = () => {
    if (data.length > 0) {
      const tempUnit = formatTemperatureUnit(data[0]?.temperatureUnit);
      return `Temperature (${tempUnit})`;
    }
    return "Temperature";
  };

  const leftAxisLabel =
    leftAxisMetric === "temperature"
      ? getTemperatureLabel()
      : (leftAxisMetric && metricLabels[leftAxisMetric]) || "";
  const rightAxisLabel =
    rightAxisMetric === "temperature"
      ? getTemperatureLabel()
      : (rightAxisMetric && metricLabels[rightAxisMetric]) || "";

  const leftAxisColor = leftAxisMetric
    ? metricConfigs[leftAxisMetric].color
    : undefined;
  const rightAxisColor = rightAxisMetric
    ? metricConfigs[rightAxisMetric].color
    : undefined;

  // Load persisted configuration
  useEffect(() => {
    if (configLoadedRef.current) return;
    if (globalThis.window === undefined) return;
    if (data.length === 0) return;

    try {
      const raw = globalThis.window.localStorage.getItem("diveGraphConfig");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        metricConfigs?: Record<string, MetricConfig>;
        leftAxisMetric?: MetricType;
        rightAxisMetric?: MetricType;
        showSegments?: boolean;
        timestamp?: number;
      };

      // Check if config is older than 1 week (7 days)
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      if (parsed.timestamp && Date.now() - parsed.timestamp > ONE_WEEK_MS) {
        // Config is stale, ignore it
        globalThis.window.localStorage.removeItem("diveGraphConfig");
        configLoadedRef.current = true;
        return;
      }

      if (parsed.metricConfigs) {
        setMetricConfigs(() => {
          const next: Record<MetricType, MetricConfig> = {
            ...DEFAULT_METRIC_CONFIGS,
          };
          (Object.keys(DEFAULT_METRIC_CONFIGS) as MetricType[]).forEach(
            (metric) => {
              const saved = parsed.metricConfigs?.[metric];
              next[metric] = {
                color: DEFAULT_METRIC_CONFIGS[metric].color,
                show: Boolean(saved?.show) && metricHasData(metric),
              };
            }
          );
          return next;
        });
      }

      const savedLeft = parsed.leftAxisMetric;
      const savedRight = parsed.rightAxisMetric;

      setLeftAxisMetric(
        savedLeft && metricHasData(savedLeft) ? savedLeft : null
      );
      setRightAxisMetric(
        savedRight && metricHasData(savedRight) ? savedRight : null
      );

      if (parsed.showSegments !== undefined) {
        setShowSegments(parsed.showSegments);
      }
    } catch {
      // Ignore malformed persistence
    } finally {
      configLoadedRef.current = true;
    }
  }, [data.length, metricHasData]);

  // Persist configuration
  useEffect(() => {
    if (globalThis.window === undefined) return;
    if (data.length === 0) return;

    const payload = {
      metricConfigs,
      leftAxisMetric,
      rightAxisMetric,
      showSegments,
      timestamp: Date.now(),
    };
    globalThis.window.localStorage.setItem(
      "diveGraphConfig",
      JSON.stringify(payload)
    );
  }, [metricConfigs, leftAxisMetric, rightAxisMetric, showSegments, data.length]);

  // Scales
  const timeExtent = d3.extent(data, (d) => d.time) as [number, number];
  const x = d3.scaleLinear(timeExtent, [marginLeft, width - marginRight]);

  const depthExtent = d3.extent(data, (d) => d.depth) as [number, number];
  const yDepth = d3.scaleLinear(depthExtent, [
    marginTop,
    height - marginBottom,
  ]);

  const temperatureExtent = d3.extent(data, (d) => d.temperature) as [
    number,
    number,
  ];
  const yTemp = d3.scaleLinear(temperatureExtent, [
    height - marginBottom,
    marginTop,
  ]);

  const yCns = d3.scaleLinear([0, 100], [height - marginBottom, marginTop]);
  const yNdl = d3.scaleLinear([0, 100], [height - marginBottom, marginTop]);

  // O2 Tox scale: [0, 100] but scales larger if extent is larger
  const o2ToxExtent = d3.extent(data, (d) => d.o2Tox) as [number, number];
  const yO2Tox = d3.scaleLinear(
    [0, Math.max(100, o2ToxExtent[1])],
    [height - marginBottom, marginTop]
  );

  // N2 Loading scale: [0, 100] but scales larger if extent is larger
  const n2LoadingExtent = d3.extent(data, (d) => d.n2Loading) as [number, number];
  const yN2Loading = d3.scaleLinear(
    [0, Math.max(100, n2LoadingExtent[1])],
    [height - marginBottom, marginTop]
  );

  // Gas percentages: always [0, 100]
  const yGasO2 = d3.scaleLinear([0, 100], [height - marginBottom, marginTop]);
  const yGasN2 = d3.scaleLinear([0, 100], [height - marginBottom, marginTop]);
  const yGasHe = d3.scaleLinear([0, 100], [height - marginBottom, marginTop]);

  // RMV: 0-80 L/min
  const rmvExtent = d3.extent(data, (d) => d.rmvLiters) as [number, number];
  const yRmvLiters = d3.scaleLinear(
    [0, Math.max(80, rmvExtent[1])],
    [height - marginBottom, marginTop]
  );

  const getScaleForMetric = (metric: MetricType | null) => {
    if (!metric) return null;
    switch (metric) {
      case "depth":
        return yDepth;
      case "temperature":
        return yTemp;
      case "cns":
        return yCns;
      case "ndl":
        return yNdl;
      case "o2Tox":
        return yO2Tox;
      case "n2Loading":
        return yN2Loading;
      case "gasO2":
        return yGasO2;
      case "gasN2":
        return yGasN2;
      case "gasHe":
        return yGasHe;
      case "rmvLiters":
        return yRmvLiters;
      default:
        return null;
    }
  };

  const leftScale = getScaleForMetric(leftAxisMetric);
  const rightScale = getScaleForMetric(rightAxisMetric);

  // Helper to create line generators
  const createLine = (
    yScale: d3.ScaleLinear<number, number>,
    accessor: (d: DataPoint) => number | string | undefined,
    definedCheck?: (d: DataPoint) => boolean
  ): d3.Line<DataPoint> => {
    const line = d3
      .line<DataPoint>()
      .x((d) => x(d.time))
      .y((d) => {
        const value = accessor(d);
        if (typeof value === "string") return yScale(parseIsoDuration(value));
        return yScale(value as number);
      });
    return definedCheck ? line.defined(definedCheck) : line;
  };

  // Line generators
  const depthLine = d3
    .line<DataPoint>()
    .x((d) => x(d.time))
    .y((d) => yDepth(d.depth));
  const tempLine = d3
    .line<DataPoint>()
    .x((d) => x(d.time))
    .y((d) => yTemp(d.temperature));
  const cnsLine = createLine(
    yCns,
    (d) => d.cns,
    (d) => d.cns !== undefined
  );
  const ndlLine = createLine(
    yNdl,
    (d) => Math.min(parseIsoDuration(d.ndl), 99),
    (d) => d.ndl !== undefined
  );
  const n2LoadingLine = createLine(
    yCns,
    (d) => d.n2Loading,
    (d) => d.n2Loading !== undefined
  );
  const o2ToxLine = createLine(
    yCns,
    (d) => d.o2Tox,
    (d) => d.o2Tox !== undefined
  );
  const rmvLitersLine = d3
    .line<DataPoint>()
    .defined((d) => d.rmvLiters !== undefined)
    .x((d) => x(d.time))
    .y((d) => yCns((d.rmvLiters! / 100) * 100));
  const gasO2Line = createLine(
    yCns,
    (d) => d.gasO2,
    (d) => d.gasO2 !== undefined
  );
  const gasN2Line = createLine(
    yCns,
    (d) => d.gasN2,
    (d) => d.gasN2 !== undefined
  );
  const gasHeLine = createLine(
    yCns,
    (d) => d.gasHe,
    (d) => d.gasHe !== undefined
  );

  // Segment visualization
  const getSegmentColor = (type: string): string => {
    switch (type) {
      case "DESCENT":
        return "rgba(30, 58, 138, 0.15)"; // Dark blue
      case "HOLD_LEVEL":
        return "rgba(34, 197, 94, 0.15)"; // Green
      case "ASCENT":
        return "rgba(168, 85, 247, 0.15)"; // Purple
      default:
        return "rgba(107, 114, 128, 0.1)"; // Gray
    }
  };

  const getSegmentLabel = (type: string): string => {
    switch (type) {
      case "DESCENT":
        return "Descending";
      case "HOLD_LEVEL":
        return "Level";
      case "ASCENT":
        return "Ascending";
      default:
        return type;
    }
  };

  // Compute segment time ranges from data
  const segmentRanges: {
    type: DiveProfileSegmentType;
    start: number;
    end: number;
  }[] =
    segments
      ?.map((s) => s.segment)
      .filter((seg) => ["DESCENT", "HOLD_LEVEL", "ASCENT"].includes(seg.type))
      .map((seg, idx, filtered) => {
        const segmentStart = data[seg.firstMeasurementIdx]?.time;
        const nextSegment = filtered[idx + 1];
        const segmentEnd = nextSegment
          ? data[nextSegment.firstMeasurementIdx]?.time
          : data.at(-1)?.time;
        return {
          type: seg.type,
          start: segmentStart,
          end: segmentEnd,
        };
      })
      .filter((seg) => seg.start !== undefined && seg.end !== undefined)
      .map(({ type, start, end }) => ({ type, start, end: end! })) || [];

  // X-axis
  useEffect(() => {
    if (gx.current && data.length > 0) {
      const startTime = timeExtent[0];
      const endTime = timeExtent[1];
      const durationMinutes = (endTime - startTime) / 60000;

      let tickInterval: number;
      if (durationMinutes <= 20) tickInterval = 60000;
      else if (durationMinutes <= 60) tickInterval = 5 * 60000;
      else if (durationMinutes <= 180) tickInterval = 10 * 60000;
      else tickInterval = 30 * 60000;

      const tickValues: number[] = [];
      for (let t = startTime; t <= endTime; t += tickInterval)
        tickValues.push(t);
      if (tickValues.at(-1)! < endTime) tickValues.push(endTime);

      d3.select(gx.current).call(
        d3
          .axisBottom(x)
          .tickValues(tickValues)
          .tickFormat((d) => {
            const elapsedMs = (d as number) - startTime;
            const minutes = Math.floor(elapsedMs / 60000);
            const seconds = Math.floor((elapsedMs % 60000) / 1000);
            return `${minutes}:${seconds.toString().padStart(2, "0")}`;
          })
      );
    }
  }, [gx, x, timeExtent, data.length]);

  // Y-axes
  useEffect(() => {
    if (gyLeft.current && data.length > 0 && leftScale && leftAxisMetric) {
      const axis = d3
        .axisLeft(leftScale)
        .tickFormat((d) => formatAxisTick(d, leftAxisMetric));
      const selection = d3.select(gyLeft.current);
      selection.call(axis);
      if (leftAxisColor)
        selection.selectAll("text").attr("fill", leftAxisColor);
    }
  }, [gyLeft, leftScale, data.length, leftAxisMetric, leftAxisColor]);

  useEffect(() => {
    if (gyRight.current && data.length > 0 && rightScale && rightAxisMetric) {
      const axis = d3
        .axisRight(rightScale)
        .tickFormat((d) => formatAxisTick(d, rightAxisMetric));
      const selection = d3.select(gyRight.current);
      selection.call(axis);
      if (rightAxisColor)
        selection.selectAll("text").attr("fill", rightAxisColor);
    }
  }, [gyRight, rightScale, data.length, rightAxisMetric, rightAxisColor]);

  // Touch events
  useEffect(() => {
    const rectElement = interactiveRectRef.current;
    if (!rectElement || data.length === 0) return;

    const handleTouchEvent = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = rectElement.getBoundingClientRect();
      const relativeX = touch.clientX - rect.left;
      const timeValue = x.invert(relativeX + marginLeft);

      const closestPoint = data.reduce((prev, curr) =>
        Math.abs(curr.time - timeValue) < Math.abs(prev.time - timeValue)
          ? curr
          : prev
        , data[0]);

      setTooltip({
        x: touch.clientX,
        y: touch.clientY,
        time: closestPoint.time,
        depth: closestPoint.depth,
        temperature: closestPoint.temperature,
        temperatureUnit: closestPoint.temperatureUnit,
        cns: closestPoint.cns,
        ndl: closestPoint.ndl,
        startTime: timeExtent[0],
      });
    };

    rectElement.addEventListener("touchstart", handleTouchEvent, {
      passive: false,
    });
    rectElement.addEventListener("touchmove", handleTouchEvent, {
      passive: false,
    });

    return () => {
      rectElement.removeEventListener("touchstart", handleTouchEvent);
      rectElement.removeEventListener("touchmove", handleTouchEvent);
    };
  }, [data, x, marginLeft, timeExtent]);

  // Click-outside to dismiss
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const svgElement = document.querySelector("svg");
      if (svgElement?.contains(target)) return;
      setTooltip(null);
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("touchend", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("touchend", handleDocumentClick);
    };
  }, []);

  if (data.length === 0) {
    return <div>No dive profile data available</div>;
  }

  const updateTooltip = (clientX: number, clientY: number, rect: DOMRect) => {
    const relativeX = clientX - rect.left;
    const timeValue = x.invert(relativeX + marginLeft);

    const closestPoint = data.reduce((prev, curr) =>
      Math.abs(curr.time - timeValue) < Math.abs(prev.time - timeValue)
        ? curr
        : prev
      , data[0]);

    // Find which segment this time falls into
    const currentSegment = segmentRanges.find(
      (seg) => closestPoint.time >= seg.start && closestPoint.time <= seg.end
    );

    setTooltip({
      x: clientX,
      y: clientY,
      time: closestPoint.time,
      depth: closestPoint.depth,
      temperature: closestPoint.temperature,
      temperatureUnit: closestPoint.temperatureUnit,
      cns: closestPoint.cns,
      ndl: closestPoint.ndl,
      n2Loading: closestPoint.n2Loading,
      o2Tox: closestPoint.o2Tox,
      rmvLiters: closestPoint.rmvLiters,
      gasO2: closestPoint.gasO2,
      gasN2: closestPoint.gasN2,
      gasHe: closestPoint.gasHe,
      startTime: timeExtent[0],
      segmentType: currentSegment
        ? getSegmentLabel(currentSegment.type)
        : undefined,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    updateTooltip(e.clientX, e.clientY, rect);
  };

  const toggleMetric = (metric: MetricType) => {
    setMetricConfigs((prev) => ({
      ...prev,
      [metric]: { ...prev[metric], show: !prev[metric].show },
    }));
  };

  return (
    <div className="relative">
      <MetricsControlPanel
        metricConfigs={metricConfigs}
        onToggleMetric={toggleMetric}
        metricHasData={metricHasData}
        leftAxisMetric={leftAxisMetric}
        rightAxisMetric={rightAxisMetric}
        onLeftAxisChange={setLeftAxisMetric}
        onRightAxisChange={setRightAxisMetric}
        hasSegments={segments !== null}
        showSegments={showSegments}
        onToggleSegments={setShowSegments}
      />

      <div
        ref={svgContainerRef}
        className={`flex-1 w-full mx-auto ${variant === "fullscreen" ? "min-w-[80%]" : "max-w-150"}`}
      >
        <svg width={width} height={height} className="w-full h-auto">
          <g ref={gx} transform={`translate(0,${height - marginBottom})`} />
          {leftScale && (
            <g ref={gyLeft} transform={`translate(${marginLeft},0)`} />
          )}
          {rightScale && (
            <g
              ref={gyRight}
              transform={`translate(${width - marginRight},0)`}
            />
          )}

          {leftScale && (
            <text
              transform={`translate(${marginLeft - 30},${height / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize="12"
              fill={leftAxisColor || "currentColor"}
            >
              {leftAxisLabel}
            </text>
          )}

          {rightScale && (
            <text
              transform={`translate(${width - marginRight + 30},${height / 2}) rotate(90)`}
              textAnchor="middle"
              fontSize="12"
              fill={rightAxisColor || "currentColor"}
            >
              {rightAxisLabel}
            </text>
          )}

          {/* Segment backgrounds */}
          {showSegments &&
            segmentRanges.map((seg, idx) => (
              <rect
                key={`segment-` + idx}
                id={`segment-${idx}`}
                x={x(seg.start)}
                y={marginTop}
                width={x(seg.end) - x(seg.start)}
                height={height - marginTop - marginBottom}
                fill={getSegmentColor(seg.type)}
                pointerEvents="none"
              />
            ))}
          <JsonViewer value={segmentRanges} />

          {/* Render metric lines */}
          {metricConfigs.depth.show && (
            <path
              fill="none"
              stroke={metricConfigs.depth.color}
              strokeWidth="1.5"
              d={depthLine(data) || ""}
            />
          )}
          {metricConfigs.temperature.show && (
            <path
              fill="none"
              stroke={metricConfigs.temperature.color}
              strokeWidth="1.5"
              d={tempLine(data) || ""}
            />
          )}
          {metricConfigs.cns.show && (
            <path
              fill="none"
              stroke={metricConfigs.cns.color}
              strokeWidth="1.5"
              d={cnsLine(data) || ""}
            />
          )}
          {metricConfigs.ndl.show && (
            <path
              fill="none"
              stroke={metricConfigs.ndl.color}
              strokeWidth="1.5"
              d={ndlLine(data) || ""}
            />
          )}
          {metricConfigs.n2Loading.show && (
            <path
              fill="none"
              stroke={metricConfigs.n2Loading.color}
              strokeWidth="1.5"
              d={n2LoadingLine(data) || ""}
            />
          )}
          {metricConfigs.o2Tox.show && (
            <path
              fill="none"
              stroke={metricConfigs.o2Tox.color}
              strokeWidth="1.5"
              d={o2ToxLine(data) || ""}
            />
          )}
          {metricConfigs.rmvLiters.show && (
            <path
              fill="none"
              stroke={metricConfigs.rmvLiters.color}
              strokeWidth="1.5"
              d={rmvLitersLine(data) || ""}
            />
          )}
          {metricConfigs.gasO2.show && (
            <path
              fill="none"
              stroke={metricConfigs.gasO2.color}
              strokeWidth="1.5"
              d={gasO2Line(data) || ""}
            />
          )}
          {metricConfigs.gasN2.show && (
            <path
              fill="none"
              stroke={metricConfigs.gasN2.color}
              strokeWidth="1.5"
              d={gasN2Line(data) || ""}
            />
          )}
          {metricConfigs.gasHe.show && (
            <path
              fill="none"
              stroke={metricConfigs.gasHe.color}
              strokeWidth="1.5"
              d={gasHeLine(data) || ""}
            />
          )}

          {/* Depth circles */}
          {metricConfigs.depth.show && (
            <g
              fill={metricConfigs.depth.color}
              stroke={metricConfigs.depth.color}
              strokeWidth="1.5"
            >
              {data.map((d) => (
                <circle
                  key={`${d.profileId}-${d.time}`}
                  cx={x(d.time)}
                  cy={yDepth(d.depth)}
                  r="1.5"
                />
              ))}
            </g>
          )}

          {/* Crosshair */}
          {tooltip && (
            <line
              x1={x(tooltip.time)}
              y1={marginTop}
              x2={x(tooltip.time)}
              y2={height - marginBottom}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 2"
              opacity="0.7"
            />
          )}

          {/* Interactive rect */}
          <rect
            ref={interactiveRectRef}
            x={marginLeft}
            y={marginTop}
            width={width - marginLeft - marginRight}
            height={height - marginTop - marginBottom}
            fill="transparent"
            style={{ cursor: "crosshair", touchAction: "none" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          />
        </svg>
      </div>

      <DiveTooltip
        tooltip={tooltip}
        width={width}
        metricConfigs={metricConfigs}
      />

      {segmentsLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-90 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium text-gray-700">Loading segments...</span>
        </div>
      )}
    </div>
  );
}
