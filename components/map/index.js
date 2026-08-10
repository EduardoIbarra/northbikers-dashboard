import dynamic from 'next/dynamic';

// Leaflet uses browser-only APIs, so it must be loaded with ssr: false
const Map = dynamic(() => import('./leaflet-map'), { ssr: false });

export default Map;
