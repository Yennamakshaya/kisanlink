import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext';

interface TelanganaMapProps {
  farmerLocation?: { name: string; lat: number; lng: number };
  buyerLocation?: { name: string; lat: number; lng: number };
  height?: string;
}

export const TelanganaMap: React.FC<TelanganaMapProps> = ({
  farmerLocation = { name: "Shadnagar, Rangareddy", lat: 17.0700, lng: 78.2045 },
  buyerLocation = { name: "Cherlapally, Hyderabad", lat: 17.4721, lng: 78.4839 },
  height = "320px"
}) => {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletInstance.current) {
      // Center map around Telangana (Rangareddy/Hyderabad center)
      const map = L.map(mapRef.current).setView([17.27, 78.35], 9);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | KisanLink'
      }).addTo(map);

      leafletInstance.current = map;
    }

    const map = leafletInstance.current;

    // Clear existing markers & layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Custom Icon helper
    const createIcon = (color: string) =>
      L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color:${color}; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

    // Add Farmer Marker
    const farmerMarker = L.marker([farmerLocation.lat, farmerLocation.lng], { icon: createIcon('#16a34a') })
      .addTo(map)
      .bindPopup(`<b>${t('farmerRole')}:</b><br/>${farmerLocation.name}`);

    // Add Buyer Marker
    const buyerMarker = L.marker([buyerLocation.lat, buyerLocation.lng], { icon: createIcon('#2563eb') })
      .addTo(map)
      .bindPopup(`<b>${t('buyerRole')}:</b><br/>${buyerLocation.name}`);

    // Add Transport Route Line
    const polyline = L.polyline([
      [farmerLocation.lat, farmerLocation.lng],
      [buyerLocation.lat, buyerLocation.lng]
    ], { color: '#059669', weight: 4, dashArray: '8, 8' }).addTo(map);

    // Fit map bounds to show route
    const group = L.featureGroup([farmerMarker, buyerMarker]);
    map.fitBounds(group.getBounds().pad(0.2));

  }, [farmerLocation, buyerLocation, t]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          {t('routeMapTitle')}
        </h4>
        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
          {t('routeDistance')}
        </span>
      </div>
      <div ref={mapRef} style={{ height }} className="w-full rounded-lg overflow-hidden z-0" />
    </div>
  );
};
