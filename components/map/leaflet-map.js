import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon paths broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_CENTER = [25.6487281, -100.4431815];

const isValidMarker = (lat, lng) => {
    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);
    return !isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0;
};

// Creates a custom icon when the marker has an `icon` prop (image URL)
const makeIcon = (iconUrl) =>
    L.icon({
        iconUrl,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });

// Inner component that auto-fits bounds whenever markers change
const BoundsFitter = ({ markers, center }) => {
    const map = useMap();

    useEffect(() => {
        // Invalidate size first so Leaflet recalculates container dimensions properly
        map.invalidateSize();

        const valid = markers.filter(m => isValidMarker(m?.latitude, m?.longitude));
        if (valid.length === 0) {
            map.setView(center, 12);
            return;
        }
        if (valid.length === 1) {
            map.setView([valid[0].latitude, valid[0].longitude], 14);
            return;
        }
        const bounds = L.latLngBounds(valid.map(m => [m.latitude, m.longitude]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, [markers]);

    return null;
};

const LeafletMap = ({ markers = [], center = DEFAULT_CENTER, width = '100%', height = '100%' }) => {
    const centerLatLng = Array.isArray(center)
        ? center
        : [center.lat ?? DEFAULT_CENTER[0], center.lng ?? DEFAULT_CENTER[1]];

    return (
        <div style={{ width, height: height === '100%' ? '100%' : height, minHeight: 200 }}>
            <MapContainer
                center={centerLatLng}
                zoom={11}
                style={{ width: '100%', height: '100%', borderRadius: '1rem' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <BoundsFitter markers={markers} center={centerLatLng} />
                {markers.map((m, idx) =>
                    isValidMarker(m?.latitude, m?.longitude) ? (
                        <Marker
                            key={idx}
                            position={[parseFloat(m.latitude), parseFloat(m.longitude)]}
                            icon={m.icon ? makeIcon(m.icon) : new L.Icon.Default()}
                        />
                    ) : null
                )}
            </MapContainer>
        </div>
    );
};

export default LeafletMap;
