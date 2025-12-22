"use client";

import FullMapPicker from "@/components/mapPickerModal";
import useApi from "@/hooks/useApi";
import { DiveSite } from "@/types/dive";
import { useEffect, useState } from "react";

type CreateDiveSiteProps = {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (site: DiveSite) => void;
};

export default function MissingDiveSite({
  open,
  initialName,
  onClose,
  onCreated,
}: Readonly<CreateDiveSiteProps>) {
  const { postWithToken } = useApi();

  const [siteName, setSiteName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSiteName(initialName ?? "");
      setLat(null);
      setLon(null);
      setStatus("");
      setShowMap(false);
    }
  }, [open, initialName]);

  if (!open) return null;

  async function handleCreateDiveSite() {
    setStatus("");

    if (!siteName.trim()) {
      setStatus("Dive site name is required.");
      return;
    }

    if (lat === null || lon === null) {
      setStatus("Please select a location on the map.");
      return;
    }

    try {
      setLoading(true);

      const body = {
        name: siteName,
        lat,
        lon,
      };

      const res = await postWithToken<DiveSite>(
        "/v1/dives/sites",
        JSON.stringify(body),
        { headers: { "Content-Type": "application/json" } },
        null
      );

      onCreated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      setStatus("Failed to create dive site.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* MODAL BACKDROP */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md relative">

          {/* HEADER */}
          <h2 className="text-xl font-semibold mb-4">
            Create Dive Site
          </h2>

          {/* SITE NAME */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">
              Dive site name
            </label>
            <input
              className="border rounded-lg p-2 w-full"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>

          {/* LOCATION PICKER */}
          <div className="mb-4">
            <button
              type="button"
              className="px-4 py-2 bg-green-600 text-white rounded-lg"
              onClick={() => setShowMap(true)}
            >
              {lat && lon
                ? "Change location on map"
                : "Pick location on map"}
            </button>

            {lat && lon && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {lat.toFixed(6)}, {lon.toFixed(6)}
              </p>
            )}
          </div>

          {/* STATUS */}
          {status && (
            <p className="mb-4 text-sm text-red-600">{status}</p>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 rounded-lg"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              onClick={handleCreateDiveSite}
              disabled={loading}
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </div>

      {/* MAP PICKER */}
      {showMap && (
        <FullMapPicker
          open={showMap}
          onSelect={(coords) => {
            setLat(coords.lat);
            setLon(coords.lon);
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
}
