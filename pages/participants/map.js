import React, {useEffect, useState, useCallback} from 'react';
import {GoogleMap, LoadScript, Marker} from '@react-google-maps/api';
import {useRecoilValue} from "recoil";
import {ParticipantsMarkers} from "../../store/atoms/global";

const containerStyle = {
    width: '40%',
    height: '100%'
};

const center = {
    lat: 25.3007901,
    lng: -100.1431214
};

const ParticipantsMap = () => {
    const markers = useRecoilValue(ParticipantsMarkers)

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
        const zoom = map.getZoom();
        map.setZoom(zoom > 11 ? 12 : zoom);

        if(!markers.length){
            map.setCenter(center)
        }
    };

    useEffect(() => {
        fitBounds()
    }, [markers]);


    return (
        <LoadScript
            googleMapsApiKey="AIzaSyDinWw03ObW9w4RzpIposc_qTLNI9dCGcQ"
        >
            <GoogleMap
                mapContainerStyle={containerStyle}
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
        </LoadScript>
    )

}

export default ParticipantsMap
