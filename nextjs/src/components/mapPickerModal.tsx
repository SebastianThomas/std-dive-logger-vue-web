"use client";

import { usePersistentMapView } from "@/hooks/mapViewState";
import type { LeafletMouseEvent } from "leaflet";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useMapEvents } from "react-leaflet";
import { MapViewTracker } from "./mapViewState";
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);



export type MapCoords = {
  lat: number;
  lon: number;
};

type MapPickerModalProps = {
  open: boolean;
  initialCoords?: MapCoords;
  onSelect: (coords: MapCoords) => void;
  onClose: () => void;
};


function ClickHandler({
  onPick,
}: {
  onPick: (coords: MapCoords) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick({
        lat: e.latlng.lat,
        lon: e.latlng.lng,
      });
    },
  });

  return null;
}


export default function MapPickerModal({
  open,
  initialCoords,
  onSelect,
  onClose,
}: Readonly<MapPickerModalProps>) {
  const [selected, setSelected] = useState<MapCoords | null>(
    initialCoords ?? null
  );

  const [mapView, setMapView] = usePersistentMapView(
    "map-picker-view",
    { lat: 20, lon: 0, zoom: 5 }
  );
  const center: [number, number] = mapView
    ? [mapView.lat, mapView.lon]
    : [20, 0];

  const zoom = mapView?.zoom ?? 5;

  useEffect(() => {
    if (open) {
      if (selected !== initialCoords) {
        console.log("Set State should have been called if this happened after the initial component was rendered. Remove selected from the dependency array");
      }
      // Maybe add this: setSelected(() => initialCoords ?? null);
    }
  }, [open, initialCoords, selected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="relative bg-white rounded-xl shadow-xl w-[95vw] h-[95vh] md:w-[80vw] md:h-[80vh]">

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-1000 px-3 py-1 bg-white rounded-lg shadow"
        >
          ✕
        </button>

        {/* MAP */}
        <MapContainer
          center={center}
          zoom={zoom}
          className="w-full h-full rounded-xl"
          scrollWheelZoom
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapViewTracker
            onChange={(state) => setMapView(state)}
          />
          <ClickHandler
            onPick={(coords) => {
              setSelected(coords);
            }}
          />

          {selected && (
            <Marker position={[selected.lat, selected.lon]} />
          )}
        </MapContainer>

        {/* CONFIRM ACTION */}
        {selected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-1000">
            <button
              className="px-6 py-3 bg-green-600 text-white rounded-xl shadow-lg"
              onClick={() => onSelect(selected)}
            >
              Use this location
            </button>
          </div>
        )}
      </div>
    </div >
  );
}
