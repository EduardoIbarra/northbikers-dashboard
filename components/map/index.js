import React, {useEffect, useState, useCallback} from 'react';
import {GoogleMap, LoadScript, Marker} from '@react-google-maps/api';
import {useRecoilValue} from "recoil";
import {ParticipantsMarkers} from "../../store/atoms/global";

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

    const fitBounds = () => {
        if (!window.google?.maps) return;
        const bounds = new window.google.maps.LatLngBounds();
        markers.map(({latitude, longitude}, idx) => {
            if (latitude === 0) return;
            bounds.extend(new window.google.maps.LatLng(latitude, longitude));
        });
        map?.fitBounds(bounds);
        const zoom = map?.getZoom();
        map?.setZoom(zoom > 11 ? 12 : zoom);

        if (!markers.length) {
            map?.setCenter(center)
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
            {markers.map((m) => {
                return m.latitude === 0 ? null : (
                    <Marker
                        key={m.id}
                        position={{lat: m.latitude, lng: m.longitude}}
                    />
                )
            })}
        </GoogleMap>
    )

}

export default Map
