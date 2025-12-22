"use client";

import DiveGraph from "@/components/dive/view/DiveGraph";
import { BasicLayout } from "@/components/globals/basic_layout";
import MapDisplay from "@/components/mapDisplayModal";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Dive, DiveWithoutProfiles, PagedResult } from "@/types/dive";
import { User } from "@/types/share";
import { isDefined } from "@/utils/arrays";
import { parseISODuration, showDuration } from "@/utils/timeUtils";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "react-toastify";
// ------------------------
// Small summary card component
// ------------------------
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white bg-opacity-90 rounded-xl shadow-md px-3 py-2 flex flex-col items-center min-w-30">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-700 text-sm">{value}</p>
    </div>
  );
}

// ------------------------
// Client component to fetch and display dive data
// ------------------------
function ViewContent({ diveId }: { diveId: number }) {
  const { auth } = useAuth();
  const { getWithToken, deleteWithToken, postWithToken } = useApi();
  const router = useRouter();

  const [graphOpen, setGraphOpen] = useState(false);
  const [dive, setDive] = useState<Dive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [myDives, setMyDives] = useState<DiveWithoutProfiles[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ---------------- Fetch dive ----------------
  useEffect(() => {
    if (auth.refreshing || !auth.loggedIn) return;

    const fetchDive = async () => {
      try {
        setLoading(true);
        const res = await getWithToken<Dive>(`/v1/dives/${diveId}`);
        setDive(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch dive");
      } finally {
        setLoading(false);
      }
    };
    fetchDive();
  }, [diveId, auth, getWithToken]);

  // ---------------- Fetch current user ID ----------------
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await getWithToken<User>("/v1/users/");
        setMyUserId(res.data.id);
      } catch (err) {
        console.error("Failed to fetch user ID", err);
      }
    };
    fetchUserId();
  }, [getWithToken]);

  // ---------------- Fetch my dives ----------------
  useEffect(() => {
    const fetchMyDives = async () => {
      if (myUserId === null) return;
      try {
        const res = await getWithToken<PagedResult<DiveWithoutProfiles>>(
          "/v1/dives?page=0&sortCol=NUMBER&sortDirection=ASCENDING"
        );
        setMyDives(res.data.result); // store for client-side search
      } catch (err) {
        console.error("Failed to fetch my dives", err);
      }
    };
    fetchMyDives();
  }, [myUserId, getWithToken]);

  // ---------------- Delete ----------------
  const handleDelete = async () => {
    if (!dive) return;
    try {
      await deleteWithToken(`/v1/dives/${diveId}`);
      toast.success("Dive deleted successfully");
      router.push("/");
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Failed to delete dive");
    }
  };

  // ---------------- Link Buddy Dive ----------------
  const handleLinkDive = async (buddyDiveId: number) => {
    if (!dive) return;
    try {
      await postWithToken(
        `/v1/dives/${diveId}/link?buddyDiveId=${buddyDiveId}`
      );
      toast.success("Dive linked successfully");
      setShowLinkModal(false);
    } catch (err) {
      console.error("Link failed", err);
      toast.error("Failed to link dive");
    }
  };

  // ---------------- Handle Escape for graph ----------------
  useEffect(() => {
    const w = globalThis || window;
    if (!graphOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGraphOpen(false);
      }
    };
    w.addEventListener("keydown", onKeyDown);
    return () => w.removeEventListener("keydown", onKeyDown);
  }, [graphOpen]);

  // TODO: Implement using backend filter
  const filteredMyDives = myDives.filter(
    (d) =>
      d.customIdentifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.number.toString().includes(searchTerm) ||
      d.site.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (error)
    return <div className="text-center py-20 text-red-500">Error: {error}</div>;
  if (!dive) return <div className="text-center py-20">No dive found</div>;

  const firstProfile = dive.profiles?.[0];
  const summary = firstProfile?.summary;
  const isMine = dive.user.id === myUserId;
  const summaries = dive.profiles?.map((p) => p.summary);
  const bottomTimeAccTemp = summaries
    .map((s) => s.bottomTime)
    .map((b) => parseISODuration(b))
    .reduce((acc, b) => ({
      hours: acc.hours + b.hours,
      minutes: acc.minutes + b.minutes,
      seconds: acc.seconds + b.seconds,
    }));
  const bottomTimeAcc = {
    seconds: bottomTimeAccTemp.seconds % 60,
    minutes:
      Math.floor(bottomTimeAccTemp.seconds / 60) +
      (bottomTimeAccTemp.minutes % 60),
    hours: Math.floor(bottomTimeAccTemp.minutes / 60) + bottomTimeAccTemp.hours,
  };

  return (
    <>
      {graphOpen ? (
        <div className="fixed inset-0 z-50 bg-gray-900 p-2">
          {/* Floating collapse button */}
          <button
            onClick={() => setGraphOpen(false)}
            className="absolute top-3 right-3 z-10 px-3 py-1.5 
               bg-blue-600 backdrop-blur rounded-lg shadow 
               text-sm text-white hover:bg-blue-900"
          >
            Collapse
          </button>

          <div className="w-full h-full bg-white rounded-xl shadow-md overflow-hidden">
            <DiveGraph dive={dive} variant="fullscreen" />
          </div>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {/* ===== Header ===== */}
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-bold">
                #{dive.number} : {dive.customIdentifier}
              </h1>

              <div className="flex gap-2">
                {isMine ? (
                  <>
                    <button
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                      onClick={() => router.push(`/dive/edit/${dive.id}`)}
                    >
                      Edit Dive
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                    onClick={() => setShowLinkModal(true)}
                  >
                    Link Dive
                  </button>
                )}
              </div>
            </div>

            <p className="text-gray-500 text-sm">
              {dive.site.name} ·{" "}
              {firstProfile?.start
                ? new Date(firstProfile.start).toLocaleString()
                : "No start date"}
            </p>
          </div>

          {/* ===== Delete Modal ===== */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">
                  Confirm Delete
                </h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete dive #{dive.number}? This
                  action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                    onClick={() => {
                      handleDelete();
                      setShowDeleteModal(false);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== Link Modal ===== */}
          {showLinkModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-lg max-h-[80vh] overflow-auto">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">
                  Link a Dive
                </h2>
                <input
                  type="text"
                  placeholder="Search my dives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 mb-4 border rounded"
                />
                <ul className="space-y-2">
                  {filteredMyDives.map((d) => (
                    <li
                      key={d.id}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded hover:bg-gray-100 cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {d.customIdentifier}
                        </p>
                        <p className="text-xs text-gray-500">
                          #{d.number} · {d.site.name} ·{" "}
                          {firstProfile?.start
                            ? new Date(firstProfile.start).toLocaleDateString()
                            : "No date"}
                        </p>
                      </div>
                      <button
                        className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                        onClick={() => handleLinkDive(d.id)}
                      >
                        Link
                      </button>
                    </li>
                  ))}
                  {filteredMyDives.length === 0 && (
                    <li className="text-sm text-gray-400">No dives found</li>
                  )}
                </ul>
                <div className="flex justify-end mt-4">
                  <button
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                    onClick={() => setShowLinkModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6">
            {/* ===== Left Column: Small Map ===== */}
            <div className="w-full md:w-1/5 h-50 rounded-lg overflow-hidden shadow-sm border">
              <MapDisplay
                sites={[
                  {
                    site: {
                      id: dive.site.id!,
                      name: dive.site.name,
                      latitude: dive.site.latitude,
                      longitude: dive.site.longitude,
                    },
                    diveIds: [dive.id],
                  },
                ]}
                center={[dive.site.latitude, dive.site.longitude]}
                zoom={13} // zoom in on the site
              />
            </div>

            {/* ===== Right Column: Dive Info ===== */}
            <div className="w-full md:w-4/5 flex flex-col gap-6">
              {/* ===== Summary Cards ===== */}
              {firstProfile && summary && (
                <section className="flex flex-wrap justify-center gap-4 md:gap-6 mb-4">
                  <SummaryItem
                    label="Max Depth"
                    value={`${summary.maxDepth} m`}
                  />
                  <SummaryItem
                    label="Avg Depth"
                    value={`${summary.averageDepth?.toFixed(2)} m`}
                  />
                  <SummaryItem
                    label="Bottom Time"
                    value={showDuration(bottomTimeAcc)}
                  />
                  {summary.surfaceInterval && (
                    <SummaryItem
                      label="Surface Interval"
                      value={summary.surfaceInterval}
                    />
                  )}
                  {summary.avgAscentRate && (
                    <SummaryItem
                      label="Avg Ascent Rate"
                      value={`${summary.avgAscentRate} m /min`}
                    />
                  )}
                  {summary.o2Toxicity && (
                    <SummaryItem
                      label="Oxygen Toxicity Unit"
                      value={`${summary.o2Toxicity}%`}
                    />
                  )}
                </section>
              )}

              {/* ===== Gases, Dive Computer & Buddies ===== */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Gases */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="font-semibold mb-2 text-gray-700 text-sm">
                    Gases
                  </h2>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {firstProfile?.measurements
                      .map((m) => m.measurement.gas)
                      .filter(isDefined)
                      .map((gas) => (
                        <li
                          key={
                            "" +
                            gas.o2 +
                            gas.he +
                            gas.n2 +
                            (gas.description || "")
                          }
                        >
                          O₂ {((gas.o2 ?? 0) * 100).toFixed(2)}% · He{" "}
                          {((gas.he ?? 0) * 100).toFixed(2)}% · N₂{" "}
                          {((gas.n2 ?? 0) * 100).toFixed(2)}%
                          {gas.description && ` – ${gas.description}`}
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Dive Computer */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="font-semibold mb-2 text-gray-700 text-sm">
                    Dive Computer
                  </h2>
                  <p className="text-xs text-gray-600">
                    {firstProfile?.diveComputer.manufacturer.name} —{" "}
                    {firstProfile?.diveComputer.customIdentifier}
                  </p>
                </div>

                {/* Buddies */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="font-semibold mb-2 text-gray-700 text-sm">
                    Buddies
                  </h2>
                  {!dive.namedBuddies.length && !dive.buddiesDives?.length ? (
                    <p className="text-xs text-gray-400">No buddies recorded</p>
                  ) : (
                    <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                      {dive.namedBuddies.map((name) => (
                        <li key={`named-${name}`}>{name}</li>
                      ))}
                      {dive.buddiesDives?.map(({ buddy, diveId }) => (
                        <li
                          key={`linked-${buddy.id}`}
                          className="flex items-center gap-1"
                        >
                          <span className="font-medium">{buddy.name}</span>
                          <button
                            onClick={() => router.push(`/dive/${diveId}`)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {buddy.name}’s dive
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== Dive Profile Graph ===== */}
          <div className="w-full flex justify-center mt-6">
            <div className="bg-white rounded-xl shadow-md w-full max-w-150 flex flex-col">
              <div className="flex justify-between items-center p-4">
                <h2 className="font-semibold text-gray-700 text-sm">
                  Dive Profile
                </h2>
                <button
                  onClick={() => setGraphOpen(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Expand
                </button>
              </div>
              <div className="flex-1 h-75">
                <DiveGraph dive={dive} variant="normal" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ------------------------
// Main page component
// ------------------------
export default function ViewDivePage({
  params,
}: {
  params: Promise<{ diveId: number }>;
}) {
  const { diveId } = use(params);

  return (
    <BasicLayout page_name="Dive Overview">
      <div
        className="bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed flex justify-center items-start pt-20 px-6 md:px-10"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <ViewContent diveId={diveId} />
      </div>
    </BasicLayout>
  );
}
