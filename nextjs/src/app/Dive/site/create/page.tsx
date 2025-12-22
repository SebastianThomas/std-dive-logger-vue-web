"use client";
import useApi from "@/hooks/useApi";
import { DiveSite } from "@/types/dive";
import { useState } from "react";

export default function CreateDiveSite({
  onCreated,
}: Readonly<{
  onCreated?: (data: DiveSite) => void;
}>) {
  const [open, setOpen] = useState(false);
  const { postWithToken } = useApi();
  const [siteName, setSiteName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState("");

  async function handleCreateDiveSite(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    if (!siteName || !latitude || !longitude) {
      setStatus("Please fill in all fields.");
      return;
    }

    try {
      const body = {
        name: siteName,
        lat: Number(latitude),
        lon: Number(longitude),
      };

      const res = await postWithToken<DiveSite>(
        "/v1/dives/sites",
        JSON.stringify(body),
        { headers: { "Content-Type": "application/json" } },
        null
      );
      const data = res.data;
      console.log(data);
      setStatus("Dive site created successfully!");
      if (onCreated) {
        onCreated(data);
      }
      setOpen(false); // close modal
    } catch (err) {
      console.error(err);
      setStatus("Error: " + (err as Error).message);
    }
  }

  return (
    <div>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow"
        onClick={() => setOpen(true)}
      >
        Add Dive Site{" "}
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Dive Site</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="site-name" className="block mb-1">Name</label>
                <input
                  type="text"
                  name="siteName"
                  id="site-name"
                  className="border rounded-lg p-2 w-full"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="latitude" className="block mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  id="latitude"
                  className="border rounded-lg p-2 w-full"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="longitude" className="block mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  id="longitude"
                  className="border rounded-lg p-2 w-full"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>

              {status && <p className="text-red-600 text-sm">{status}</p>}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  onClick={handleCreateDiveSite}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
