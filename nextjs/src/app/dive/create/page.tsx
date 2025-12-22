"use client";

import MissingDiveSite from "@/components/dive/create/site/missingDiveSite";
import UploadDiveFile from "@/components/dive/create/UploadDiveFile";
import { BasicLayout } from "@/components/globals/basic_layout";
import useApi from "@/hooks/useApi";
import { DiveWithoutProfiles } from "@/types/dive";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

export default function FastDiveUpload() {
    const router = useRouter();
    const { postWithToken } = useApi();
    const [showCreateSite, setShowCreateSite] = useState(false);
    const [missingSiteName, setMissingSiteName] = useState<string | null>(null);

    const [data, setData] = useState<{ files: File[] }>({ files: [] });
    const handleSubmit = async () => {
        const { files } = data;

        if (!files || files.length === 0) {
            toast.info("Please add at least one file.");
            return;
        }

        try {
            const formDataObj = new FormData();
            const body = {}

            const bodyBlob = new Blob([JSON.stringify(body)], { type: "application/json" });
            formDataObj.append("uploadBody", bodyBlob);
            files.forEach((file) => formDataObj.append("file", file));
            const res = await postWithToken<DiveWithoutProfiles[]>("/v1/dives/upload", formDataObj, {}, null);
            toast.success("Upload complete!", { autoClose: 3000 });
            const dive = res.data?.[0];

            if (!dive?.id) {
                toast("Something went wrong on our side, returning to Home")
                router.push('/')
                console.error("No dive ID returned", res.data);
                return;
            }

            router.push(`/dive/view/${dive.id}`);
        }

        catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                const data = err.response.data as {
                    title?: string;
                    field?: string;
                    additionalMessage?: string;
                    status?: number;
                    name?: string;
                    reason?: string;
                };

                if (data.reason === "MISSING_VALUE" && data.field === "DIVE_SITE") {
                    if (data.title) {
                        toast.info(
                            <div>
                                <strong>{data.title}</strong>
                                <div>Dive Site not registered, please select the site on the map</div>
                            </div>
                        );

                    }
                    setMissingSiteName(data.name ?? null);
                    setShowCreateSite(true);
                    return;
                }

                toast.error("Upload not completable, check your Filename has no spaces or you haven't already uplaoded this file", { autoClose: 4000 });
            } else {
                // Fallback for non-Axios errors
                console.error("Unexpected error:", err);
            }
        }
    }
    return (
        <BasicLayout page_name="Upload Dive Files">
            <div className="w-full bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed min-h-[calc(100vh-64px)]">
                <main
                    className="flex-1 relative flex justify-center items-start pt-10 px-6 md:px-10">
                    <div className="max-w-3xl w-full bg-white p-6 rounded-lg shadow-lg">
                        <UploadDiveFile
                            data={data}
                            setData={(updater) =>
                                setData((prev) => {
                                    const updated = updater(prev);
                                    return { files: updated.files || [] };
                                })
                            }
                            nextStep={() => { }}
                            prevStep={() => router.back()}
                            mode="create"
                        />

                        <div className="flex justify-between mt-6 gap-4">

                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </main>
                {showCreateSite && (
                    <MissingDiveSite
                        open={showCreateSite}
                        initialName={missingSiteName ?? ""}
                        onClose={() => setShowCreateSite(false)}
                        onCreated={async (site) => {
                            setShowCreateSite(false);
                            toast.info(`Successfully created site ${site.name}, retrying upload...`)
                            await handleSubmit();
                        }}
                    />
                )}
            </div >
        </BasicLayout >
    );
}
