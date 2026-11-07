"use client";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Place } from "@/lib/types";
import { thumb } from "@/lib/photos";

const HEART_PIN = `
<svg class="pin" width="34" height="42" viewBox="0 0 34 42">
  <path d="M17 1C8.2 1 1 7.9 1 16.6 1 28 17 41 17 41s16-13 16-24.4C33 7.9 25.8 1 17 1z" fill="#E11D2E" stroke="#fff" stroke-width="2"/>
  <path d="M17 23.5s-6-3.7-6-7.6c0-2 1.6-3.4 3.4-3.4 1.1 0 2 .5 2.6 1.4.6-.9 1.5-1.4 2.6-1.4 1.8 0 3.4 1.4 3.4 3.4 0 3.9-6 7.6-6 7.6z" fill="#fff"/>
</svg>`;

function photoPin(url: string) {
  const safe = encodeURI(url).replace(/['()"]/g, (c) => "%" + c.charCodeAt(0).toString(16));
  return `
<div class="pin" style="position:relative;width:44px;height:52px">
  <div style="width:44px;height:44px;border-radius:50%;background:#E11D2E;padding:3px;box-sizing:border-box">
    <div style="width:100%;height:100%;border-radius:50%;background:#fff center/cover no-repeat url('${safe}');border:2px solid #fff;box-sizing:border-box"></div>
  </div>
  <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid #E11D2E"></div>
</div>`;
}

function iconFor(place: Place, active: boolean) {
  const photo = place.photos[0];
  return L.divIcon({
    className: `heart-pin${active ? " active" : ""}`,
    html: photo ? photoPin(thumb(photo, 120)) : HEART_PIN,
    iconSize: photo ? [44, 52] : [34, 42],
    iconAnchor: photo ? [22, 52] : [17, 42],
  });
}

const DRAFT_ICON = L.divIcon({
  className: "heart-pin active",
  html: `<div class="pin-drop">${HEART_PIN.replace('fill="#E11D2E"', 'fill="#18181b"')}</div>`,
  iconSize: [34, 42],
  iconAnchor: [17, 42],
});

function Bridge({ onReady, onClick }: { onReady: (m: L.Map) => void; onClick?: (ll: L.LatLng) => void }) {
  const map = useMap();
  useEffect(() => onReady(map), [map, onReady]);
  useMapEvents({ click: (e) => onClick?.(e.latlng) });
  return null;
}

export type MapViewProps = {
  places: Place[];
  activeId: string | null;
  draft: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
  onMapClick?: (ll: { lat: number; lng: number }) => void;
  onReady: (m: L.Map) => void;
  /** Place whose popup is open, with its rendered content. */
  popup: { place: Place; content: React.ReactNode } | null;
  onPopupClose: (id: string) => void;
  /** Keep the popup clear of floating UI (search bar, side panel, buttons). */
  popupPadding: { topLeft: [number, number]; bottomRight: [number, number] };
};

export default function MapView({ places, activeId, draft, onSelect, onMapClick, onReady, popup, onPopupClose, popupPadding }: MapViewProps) {
  const fitted = useRef(false);
  const mapRef = useRef<L.Map | null>(null);

  const handleReady = useMemo(
    () => (m: L.Map) => {
      mapRef.current = m;
      onReady(m);
    },
    [onReady]
  );

  // Fit to all pins the first time data arrives.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || fitted.current || places.length === 0) return;
    fitted.current = true;
    if (activeId) return; // a place was already picked — don't yank the view away from it
    if (places.length === 1) m.setView([places[0].lat, places[0].lng], 13);
    else m.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 13 });
  }, [places, activeId]);

  return (
    <MapContainer
      center={[13.7563, 100.5018]}
      zoom={6}
      zoomControl={false}
      className="h-full w-full"
      worldCopyJump
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <Bridge onReady={handleReady} onClick={onMapClick ? (ll) => onMapClick({ lat: ll.lat, lng: ll.lng }) : undefined} />
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={iconFor(p, p.id === activeId)}
          zIndexOffset={p.id === activeId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(p.id) }}
        />
      ))}
      {popup && (
        <Popup
          key={popup.place.id}
          position={[popup.place.lat, popup.place.lng]}
          offset={popup.place.photos[0] ? [0, -46] : [0, -36]}
          closeButton={false}
          className="raopai-popup"
          autoPanPaddingTopLeft={popupPadding.topLeft}
          autoPanPaddingBottomRight={popupPadding.bottomRight}
          eventHandlers={{ remove: () => onPopupClose(popup.place.id) }}
        >
          {popup.content}
        </Popup>
      )}
      {draft && <Marker position={[draft.lat, draft.lng]} icon={DRAFT_ICON} zIndexOffset={2000} />}
    </MapContainer>
  );
}
