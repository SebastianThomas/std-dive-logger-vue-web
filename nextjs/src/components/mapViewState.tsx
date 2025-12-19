import { MapViewState } from "@/types/mapTypes";
import { useMapEvents } from "react-leaflet/hooks";

export function MapViewTracker({
    onChange,
}: {
    onChange: (state: MapViewState) => void;
}) {
    const map = useMapEvents({
        moveend() {
            const center = map.getCenter();
            onChange({
                lat: center.lat,
                lon: center.lng,
                zoom: map.getZoom(),
            });
        },
    });

    return null;
}