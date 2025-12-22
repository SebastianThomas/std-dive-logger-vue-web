"use client";

import EditDivePage from "@/components/dive/create/EditDivePage";
import useApi from "@/hooks/useApi";
import type { Dive, DiveSite } from "@/types/dive";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type EditDiveProps = {
  diveId: number;
  onClose: () => void;
};
function siteHasChanged(original: DiveSite | null, edited: DiveSite | null) {
  if (!original && !edited) return false;
  if ((!original && edited) || (original && !edited)) return true;
  return (
    original!.name !== edited!.name ||
    original!.latitude !== edited!.latitude ||
    original!.longitude !== edited!.longitude
  );
}

export default function EditDive({ diveId, onClose }: Readonly<EditDiveProps>) {
  const { getWithToken, putWithToken, postWithToken } = useApi();

  const [formData, setFormData] = useState<{
    step1: {
      diveNumber?: number;
      diveName?: string;
      diveSite?: DiveSite | null;
      diveBuddies?: string[];
    };
    originalSite: DiveSite | null;
  }>({
    step1: { diveBuddies: [] },
    originalSite: null,
  });

  useEffect(() => {
    const fetchDive = async () => {
      try {
        const res = await getWithToken<Dive>(`/v1/dives/${diveId}`);
        const dive = res.data;

        setFormData({
          step1: {
            diveNumber: dive.number,
            diveName: dive.customIdentifier,
            diveSite: dive.site,
            diveBuddies: dive.namedBuddies ?? [],
          },
          originalSite: dive.site,
        });
      } catch (err) {
        toast.error("Could not load dive data.");
        console.error(err);
      }
    };
    fetchDive();
  }, [diveId, getWithToken]);

  async function tryCreateNewSite(newSite: DiveSite | null, lat: number, lon: number) {
    // Create a new site
    const name = newSite?.name ?? "";
    if (!name) {
      toast.error("Dive Site name cannot be empty.");
    }
    try {
      const newSiteData = {
        name,
        lat,
        lon,
      };
      const createdSite = await postWithToken<DiveSite>(
        "/v1/dives/sites",
        newSiteData
      );
      const returned = createdSite.data;
      if (!returned.id) {
        toast.error("Created dive site has no ID.");
        return null;
      }
      return {
        id: returned.id,
        name: returned.name,
        latitude: returned.latitude,
        longitude: returned.longitude,
      };
    } catch (err) {
      console.error(err);
      toast.error("Failed to create new dive site.");
      return null;
    }
  }

  async function getSitePayload(
    originalSite: DiveSite | null,
    newSite: DiveSite | null
  ): Promise<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  } | null> {
    if (siteHasChanged(originalSite, newSite)) {
      const lat = newSite?.latitude ?? 0;
      const lon = newSite?.longitude ?? 0;

      // Check for existing sites
      let existingSites: DiveSite[] = [];
      try {
        const res = await getWithToken<DiveSite[]>(
          `/v1/dives/sites/location?lat=${lat}&lon=${lon}`
        );
        existingSites = res.data;
      } catch (err) {
        console.error(err);
        toast.error("Failed to check for existing dive site.");
        return null;
      }

      if (existingSites.length > 0) {
        const existing = existingSites[0];
        if (!existing.id) {
          toast.error("Existing dive site has no ID.");
          return null;
        }
        return {
          id: existing.id,
          name: existing.name,
          latitude: existing.latitude,
          longitude: existing.longitude,
        };
      } else {
        return await tryCreateNewSite(newSite, lat, lon);
      }
    }
    return originalSite ? {
      id: originalSite.id!,
      name: originalSite.name,
      latitude: originalSite.latitude,
      longitude: originalSite.longitude,
    } : null;
  }

  const handleSubmit = async () => {
    const { step1, originalSite } = formData;
    const newSite = step1.diveSite ?? null;

    const sitePayload = await getSitePayload(originalSite, newSite);

    if (!sitePayload) {
      toast.error("Dive site information is missing.");
      return;
    }

    const payload = {
      id: diveId,
      number: step1.diveNumber ?? 1,
      customIdentifier: step1.diveName ?? null,
      siteId: sitePayload.id,
      namedBuddies: step1.diveBuddies ?? null,
    };

    try {
      await putWithToken("/v1/dives", payload, {
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Dive updated successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update dive.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-[90vw] h-[90vh] p-6 overflow-auto relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl font-bold"
        >
          ✕
        </button>

        {/* content */}
        <div className="flex-1 overflow-auto">
          <EditDivePage
            data={formData.step1}
            setData={(updater) =>
              setFormData((prev) => ({
                ...prev,
                step1: updater(prev.step1),
              }))
            }
          />
        </div>

        {/* SUBMIT */}
        <div className="mt-4 pt-4 border-t flex justify-end">
          <button
            onClick={handleSubmit}
            className="bg-green-600 text-white px-6 py-2 rounded"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
