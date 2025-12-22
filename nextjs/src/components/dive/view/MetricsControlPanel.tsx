import { MetricConfig, MetricType, metricDisplayNames, metricLabels } from "@/types/graph";

type MetricsControlPanelProps = {
  metricConfigs: Record<MetricType, MetricConfig>;
  onToggleMetric: (metric: MetricType) => void;
  metricHasData: (metric: MetricType) => boolean;
  leftAxisMetric: MetricType | null;
  rightAxisMetric: MetricType | null;
  onLeftAxisChange: (metric: MetricType | null) => void;
  onRightAxisChange: (metric: MetricType | null) => void;
  hasSegments?: boolean;
  showSegments?: boolean;
  onToggleSegments?: (show: boolean) => void;
};

export function MetricsControlPanel({
  metricConfigs,
  onToggleMetric,
  metricHasData,
  leftAxisMetric,
  rightAxisMetric,
  onLeftAxisChange,
  onRightAxisChange,
  hasSegments = false,
  showSegments = false,
  onToggleSegments,
}: Readonly<MetricsControlPanelProps>) {
  return (
    <div className="mb-5 p-3 sm:p-4 border border-gray-300 rounded-lg bg-gray-50 shadow-lg w-full max-w-250 mx-auto">
      <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
        {/* Metrics checkboxes */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
          <span className="text-sm font-semibold text-gray-800">Metrics:</span>
          {(Object.keys(metricConfigs) as MetricType[]).map((metric) => (
            <label
              key={metric}
              htmlFor={`metric-${metric}`}
              className={`flex items-center gap-1.5 ${metricHasData(metric) ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
            >
              <input
                id={`metric-${metric}`}
                type="checkbox"
                checked={metricConfigs[metric].show}
                onChange={() => onToggleMetric(metric)}
                disabled={!metricHasData(metric)}
                className="w-4 h-4"
              />
              <span
                style={{ color: metricConfigs[metric].color }}
                className="font-bold capitalize text-sm"
              >
                {metricDisplayNames[metric]}
              </span>
            </label>
          ))}
        </div>

        {/* Axis selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-130 md:mx-auto">

          {/* Left Axis */}
          <div className="grid grid-cols-[auto_minmax(160px,1fr)] gap-x-3 items-center">
            <label
              htmlFor="left-axis-select"
              className="text-sm font-semibold text-gray-800 whitespace-nowrap"
            >
              Left Axis:
            </label>
            <select
              id="left-axis-select"
              value={leftAxisMetric || ""}
              onChange={(e) =>
                onLeftAxisChange((e.target.value as MetricType) || null)
              }
              className="p-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">None</option>
              {(Object.keys(metricConfigs) as MetricType[]).map((metric) => (
                <option
                  key={metric}
                  value={metric}
                  disabled={!metricConfigs[metric].show}
                >
                  {metricLabels[metric]}
                </option>
              ))}
            </select>
          </div>

          {/* Right Axis */}
          <div className="grid grid-cols-[auto_minmax(160px,1fr)] gap-x-3 items-center">
            <label
              htmlFor="right-axis-select"
              className="text-sm font-semibold text-gray-800 whitespace-nowrap"
            >
              Right Axis:
            </label>
            <select
              id="right-axis-select"
              value={rightAxisMetric || ""}
              onChange={(e) =>
                onRightAxisChange((e.target.value as MetricType) || null)
              }
              className="p-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">None</option>
              {(Object.keys(metricConfigs) as MetricType[]).map((metric) => (
                <option
                  key={metric}
                  value={metric}
                  disabled={!metricConfigs[metric].show}
                >
                  {metricLabels[metric]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Segment toggle */}
        {onToggleSegments && (
          <div className="flex items-center gap-4 w-full">
            <label
              htmlFor="show-segments"
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                id="show-segments"
                type="checkbox"
                checked={showSegments}
                onChange={(e) => onToggleSegments(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-gray-800">
                Show dive segments
              </span>
            </label>
            {hasSegments && (
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: "rgba(30, 58, 138, 0.3)" }}
                  />
                  <span>Descending</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: "rgba(34, 197, 94, 0.3)" }}
                  />
                  <span>Level</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: "rgba(168, 85, 247, 0.3)" }}
                  />
                  <span>Ascending</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
