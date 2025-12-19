"use client";

import FullMapPicker from "@/components/mapPickerModal";
import type { DiveSite } from "@/types/dive";
import { KeyboardEvent, useState } from "react";
type Step1Props = {
    data: {
        diveNumber?: number;
        diveName?: string;
        diveSite?: DiveSite | null;
        diveBuddies?: string[];
    };
    setData: (updater: (prev: Step1Props["data"]) => Step1Props["data"]) => void;
};

export default function EditDivePage({ data, setData }: Step1Props) {
    const [showMap, setShowMap] = useState(false);
    const [buddyInput, setBuddyInput] = useState("");


    const handleDiveNumberChange = (value: number) => {
        setData(prev => ({
            ...prev,
            diveNumber: value
        }));
    };

    const handleDiveNameChange = (value: string) => {
        setData(prev => ({ ...prev, diveName: value }));
    };

    const handleDiveSiteChange = (name: string, lat: number, lon: number) => {
        setData(prev => ({ ...prev, diveSite: { name, latitude: lat, longitude: lon } }));
    };

    const handleDiveBuddiesChange = (buddies: string[]) => {
        setData(prev => ({ ...prev, diveBuddies: buddies }));
    };

    // Tag-style buddy input logic
    const addBuddy = () => {
        const name = buddyInput.trim();
        if (name && !(data.diveBuddies?.includes(name))) {
            handleDiveBuddiesChange([...(data.diveBuddies || []), name]);
        }
        setBuddyInput("");
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addBuddy();
        }
    };

    const removeBuddy = (name: string) => {
        handleDiveBuddiesChange((data.diveBuddies || []).filter(b => b !== name));
    };

    return (
        <>
            <div>
                <h2 className="text-xl font-semibold mb-4">Step 1: Dive Info</h2>
                <form>
                    <label className="block mb-2">Dive Number</label>
                    <input
                        type="number"
                        className="w-full p-2 border rounded mb-4"
                        value={data.diveNumber ?? ""}
                        onChange={(e) => handleDiveNumberChange(Number(e.target.value))}
                        placeholder="Enter dive number"
                        required
                    />

                    <label className="block mb-2">Dive Name</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded mb-4"
                        value={data.diveName ?? ""}
                        onChange={(e) => handleDiveNameChange(e.target.value)}
                        placeholder="Enter name of your dive"
                        required
                    />

                    {/* Location */}
                    <div className="mb-4">
                        <label className="block mb-2">Location</label>
                        <div className="flex gap-2 items-end">
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                placeholder="Location Name"
                                value={data.diveSite?.name ?? ""}
                                onChange={(e) =>
                                    handleDiveSiteChange(e.target.value, data.diveSite?.latitude ?? 0, data.diveSite?.longitude ?? 0)
                                }
                            />
                            <button
                                type="button"
                                className="bg-blue-600 text-white px-4 py-1 rounded"
                                onClick={() => setShowMap(true)}
                            >
                                Choose on Map
                            </button>
                        </div>
                        {data.diveSite && (
                            <p className="text-sm mt-1 text-gray-600">
                                Selected: {data.diveSite.latitude.toFixed(5)}, {data.diveSite.longitude.toFixed(5)}
                            </p>
                        )}
                    </div>

                    {/* Dive Buddies - tag input */}
                    <label className="block mb-2">Dive Buddies</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(data.diveBuddies || []).map(b => (
                            <span
                                key={b}
                                className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                            >
                                {b}
                                <button
                                    type="button"
                                    className="ml-1 text-red-500 font-bold"
                                    onClick={() => removeBuddy(b)}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            className="flex-1 p-2 border rounded"
                            placeholder="Enter a buddy and press Enter"
                            value={buddyInput}
                            onChange={(e) => setBuddyInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </form>
            </div>


            {/* Map Modal */}
            {showMap && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="w-[90vw] h-[90vh] bg-white rounded shadow-lg relative overflow-hidden z-[1000]">
                        {/* Close Button */}
                        <button
                            className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded shadow-md z-[2000]"
                            onClick={() => setShowMap(false)}
                        >
                            Close
                        </button>

                        {/* Local state for selected coordinates */}
                        {/** We'll store temporary selection */}

                        <FullMapPicker
                            open={showMap}
                            initialCoords={
                                data.diveSite
                                    ? { lat: data.diveSite.latitude, lon: data.diveSite.longitude }
                                    : undefined
                            }
                            onSelect={(coords) => {
                                handleDiveSiteChange(
                                    data.diveSite?.name ?? "",
                                    coords.lat,
                                    coords.lon
                                );
                                setShowMap(false);
                            }}
                            onClose={() => setShowMap(false)}
                        />

                    </div>
                </div>
            )}
        </>
    );
}
