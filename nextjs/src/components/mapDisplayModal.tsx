"use client";
import { usePersistentMapView } from "@/hooks/mapViewState";
import "@/lib/leafletIcon";
import type { MapViewState } from "@/types/mapTypes";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { MapViewTracker } from "./mapViewState";
const MapContainer = dynamic(() =>
    import("react-leaflet").then(m => m.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(() =>
    import("react-leaflet").then(m => m.TileLayer),
    { ssr: false }
);
const Marker = dynamic(() =>
    import("react-leaflet").then(m => m.Marker),
    { ssr: false }
);
const Popup = dynamic(() =>
    import("react-leaflet").then(m => m.Popup),
    { ssr: false }
);

type SiteWithDives = {
    site: {
        id: number;
        name: string;
        latitude: number;
        longitude: number;
    };
    diveIds: number[];
};


export default function MapDisplay({
    sites = [],
    center,
    zoom
}: Readonly<{
    sites: SiteWithDives[];
    center?: [number, number]; // optional center
    zoom?: number;             // optional zoom
}>) {
    const router = useRouter();
    const [mapView, setMapView] = usePersistentMapView(
        "map-picker-view",
        { lat: 46, lon: 8, zoom: 5 }
    );
    const lastUpdate = useRef(0);

    const handleMapChange = (state: MapViewState) => {
        const now = Date.now();
        if (now - lastUpdate.current < 150) {
            return;
        }

        lastUpdate.current = now;
        setMapView(state);
    };
    const mapCenter = center ?? [mapView.lat, mapView.lon];
    const mapZoom = zoom ?? mapView.zoom;

    return (
        <div className="relative w-full h-full">
            <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapViewTracker
                    onChange={handleMapChange
                    }
                />

                {sites.map(({ site, diveIds }) => (
                    <Marker
                        key={site.id}
                        position={[site.latitude, site.longitude]}
                    >
                        <Popup>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                <h3 className="font-bold">{site.name}</h3>
                                <p className="text-sm opacity-70">Site ID: {site.id}</p>

                                <div className="mt-2">
                                    <p className="font-semibold mb-1">Dive IDs:</p>
                                    <ul className="space-y-1">
                                        {diveIds.map(id => (
                                            <li key={id} className="flex items-center justify-between">
                                                <span>{id}</span>
                                                <button
                                                    className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                    onClick={() => router.push(`/Dive/view/${id}`)}
                                                >
                                                    View Dive
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}