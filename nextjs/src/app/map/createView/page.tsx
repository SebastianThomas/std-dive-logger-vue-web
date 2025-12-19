"use client";
import { BasicLayout } from "@/app/helper/basic_layout";
import useApi from "@/hooks/useApi";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
const MapDisplay = dynamic(() => import("@/components/mapDisplayModal"), { ssr: false });

type SiteWithDives = {
  site: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  };
  diveIds: number[];
};

export default function CreateMapViewPage() {
  const [sites, setSites] = useState<SiteWithDives[]>([]);
  const { getWithToken } = useApi();

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchDives() {
      try {
        const res = await getWithToken("/v1/dives/sites");
        setSites(res.data);
      } catch (err) {
        console.error(err);
      }
    }

    fetchDives();
  }, [getWithToken]);

  return (
    <BasicLayout page_name="Create Map View">
      {/* Map container takes remaining space */}
      <MapDisplay sites={sites} />
    </BasicLayout>
  );
}
