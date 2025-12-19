import { DiveProfileSegmentWithId } from "@/types/dive";
import { useEffect, useState } from "react";
import { useApi } from "./useApi";

export function useDiveProfileSegments(diveId: number | undefined, shouldFetch: boolean = true) {
  const { getWithToken } = useApi();
  const [segments, setSegments] = useState<DiveProfileSegmentWithId[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!diveId || !shouldFetch) {
      return;
    }

    const fetchSegments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getWithToken(`/v1/dives/analytics/segments?id=${diveId}`);
        setSegments(response.data as DiveProfileSegmentWithId[]);
      } catch (err) {
        console.error("Failed to fetch dive segments:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch segments");
        setSegments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diveId, shouldFetch]);

  return { segments, loading, error };
}
