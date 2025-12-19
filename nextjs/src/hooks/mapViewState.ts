"use client";

import { useEffect, useState } from "react";
import type { MapViewState } from "@/types/mapTypes";

function safeParseMapView(
    saved: string | null,
    initial: MapViewState
): MapViewState {
    if (!saved) return initial;

    try {
        const parsed = JSON.parse(saved);

        // Runtime validation
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            typeof parsed.lat === "number" &&
            typeof parsed.lon === "number" &&
            typeof parsed.zoom === "number"
        ) {
            return parsed as MapViewState;
        }

        console.error(
            "usePersistentMapView: Stored data has invalid shape:",
            parsed
        );
        return initial;
    } catch (err) {
        console.error("usePersistentMapView: Failed to parse map view:", err);
        return initial;
    }
}

export function usePersistentMapView(
    storageKey: string,
    initial: MapViewState
) {
    const [mapView, setMapView] = useState<MapViewState>(() => {
        if (typeof window === "undefined") return initial;

        const saved = localStorage.getItem(storageKey);
        return safeParseMapView(saved, initial);
    });

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(mapView));
    }, [mapView, storageKey]);

    return [mapView, setMapView] as const;
}
