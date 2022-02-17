import {atom} from "recoil";

export const SideNavCollapsed = atom({
    key: 'SideNavCollapsed',
    default: false
})

export const Routes = atom({
    key: 'Routes',
    default: []
})

export const CurrentRoute = atom({
    key: 'CurrentRoute',
    default: {}
})

export const ParticipantsMarkers = atom({
    key: 'ParticipantsMarkers',
    default: [
        // {latitude: 25.3008901, longitude: -100.1431214},
        // {latitude: 25.3009902, longitude: -100.1431213},
        // {latitude: 25.3003903, longitude: -100.1431212},
        // {latitude: 25.3006904, longitude: -100.1431214},
        // {latitude: 25.3001905, longitude: -100.1431215},
    ]
})


