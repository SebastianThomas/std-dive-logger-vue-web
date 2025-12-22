"use client";

import { BasicLayout } from "@/components/globals/basic_layout";
import useApi from "@/hooks/useApi";
import { Dive, DiveDepthVariance } from "@/types/dive";
import { JsonViewer } from "@textea/json-viewer";
import axios from "axios";
import { use, useCallback, useState } from "react";

export default function AnalyticsDepth({
  params,
}: {
  params: Promise<{ diveId: number }>;
}) {
  const { diveId } = use(params);
  const { getWithToken } = useApi();

  const [dive, setDive] = useState<{
    id: number;
    customIdentifier: string;
  } | null>(null);
  const [analytics, setAnalytics] = useState<DiveDepthVariance[] | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [dive, analytics] = await Promise.all([
        getWithToken<Dive>(`/v1/dives/${diveId}`),
        getWithToken<DiveDepthVariance[]>(
          `/v1/dives/analytics/depth-variance?id=${diveId}`
        ),
      ]);
      setDive(dive.data);
      setAnalytics(analytics.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.log("Axios Error while fetching data", err);
      } else {
        console.error("Error while fetching data", err);
      }
    }
  }, [diveId, setDive, setAnalytics, getWithToken]);
  fetchData();

  return (
    <BasicLayout page_name="Depth Analytics">
      Analytics for dive: {dive ? dive.customIdentifier : diveId}
      {analytics === null ? (
        <div>Loding and preparing data...</div>
      ) : (
        <JsonViewer value={analytics} />
      )}
    </BasicLayout>
  );
}
