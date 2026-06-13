import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default Leaflet icon issues in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const customIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type Props = {
  pickupCoords: [number, number] | null;
  dropoffCoords: [number, number] | null;
  routeCoordinates: [number, number][] | null;
};

// This component re-centers the map whenever coordinates change
function MapUpdater({ pickupCoords, dropoffCoords, routeCoordinates }: Props) {
  const map = useMap();

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      // Fit the map to show both markers with padding
      const bounds = L.latLngBounds([pickupCoords, dropoffCoords]);
      
      // If we have route coordinates, include them in bounds
      if (routeCoordinates && routeCoordinates.length > 0) {
        routeCoordinates.forEach(coord => bounds.extend(coord));
      }
      
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5, maxZoom: 15 });
    } else if (pickupCoords) {
      map.flyTo(pickupCoords, 13, { duration: 1.5 });
    }
  }, [pickupCoords, dropoffCoords, routeCoordinates, map]);

  return null;
}

export default function RouteMap({ pickupCoords, dropoffCoords, routeCoordinates }: Props) {
  useEffect(() => {
    // Ensuring global leaflet icons are fixed
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }, []);

  const defaultCenter: [number, number] = [28.6139, 77.2090]; // New Delhi

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-glass)', marginTop: '1.5rem' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={11} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* This component handles re-centering and zooming */}
        <MapUpdater 
          pickupCoords={pickupCoords} 
          dropoffCoords={dropoffCoords} 
          routeCoordinates={routeCoordinates} 
        />

        {pickupCoords && (
          <Marker position={pickupCoords} icon={customIcon}>
            <Popup>📍 Pickup Location</Popup>
          </Marker>
        )}
        
        {dropoffCoords && (
          <Marker position={dropoffCoords} icon={customIcon}>
            <Popup>🏁 Drop-off Location</Popup>
          </Marker>
        )}

        {routeCoordinates && (
          <Polyline 
            positions={routeCoordinates} 
            color="#2563eb" 
            weight={5} 
            opacity={0.8}
            dashArray=""
          />
        )}
      </MapContainer>
    </div>
  );
}
