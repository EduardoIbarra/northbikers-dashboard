import React, {useCallback, useEffect, useState} from 'react';
import {GoogleMap, Marker} from '@react-google-maps/api';

const DEFAULT_CENTER = {
    lat: 25.6487281,
    lng: -100.4431815
};

const Map = ({markers = [], center = DEFAULT_CENTER, width = '40%', height = '100%'}) => {
    const [map, setMap] = useState(null);

    const onLoad = useCallback(
        function onLoad(mapInstance) {
            // do something with map Instance
            setMap(mapInstance)
        }
    )

    const isValidMarker = (latitude, longitude) => {
        return latitude && longitude && latitude !== 0 && longitude !== 0;
    }

    const fitBounds = () => {
        if (!window.google?.maps) return;
        const bounds = new window.google.maps.LatLngBounds();
        markers.map(({latitude, longitude}, idx) => {
            if (!isValidMarker(latitude,longitude)) return;
            bounds.extend(new window.google.maps.LatLng(latitude, longitude));
        });
        map?.fitBounds(bounds);
        const zoom = map?.getZoom();
        map?.setZoom(zoom > 11 ? 12 : zoom);

        if (!markers.length) {
            map?.setCenter(center)
        }

        if(markers.every(({latitude, longitude}, idx) => !isValidMarker(latitude,longitude))){
            map?.setCenter(DEFAULT_CENTER)
        }
    };

    useEffect(() => {
        fitBounds()
    }, [markers]);

    return (
        <GoogleMap
            mapContainerStyle={{width, height}}
            center={center}
            onLoad={onLoad}
            zoom={11}
        >
            {markers.map((m, idx) => {
                return isValidMarker(m?.latitude, m?.longitude) ? (
                    <Marker
                        key={idx}
                        position={{lat: m.latitude, lng: m.longitude}}
                        label={m.text ? {color: '#000000', fontWeight: 'bold', fontSize: '16px', text: `${m.text}`} : null}
                        {...m}
                    />
                ): null
            })}
        </GoogleMap>
    )

}

export default Map
