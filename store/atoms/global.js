import {atom} from "recoil";

// Next.js reloads this module during development. Reuse the existing atom
// instances so Recoil does not attempt to register the same keys again.
const atomCache = globalThis.__northbikersRecoilAtoms__ || {};
globalThis.__northbikersRecoilAtoms__ = atomCache;

const cachedAtom = (key, defaultValue) => {
    if (!atomCache[key]) {
        atomCache[key] = atom({key, default: defaultValue});
    }
    return atomCache[key];
};

export const SideNavCollapsed = cachedAtom('SideNavCollapsed', true);

export const Routes = cachedAtom('Routes', []);

export const CurrentRoute = cachedAtom('CurrentRoute', {});

export const ParticipantsMarkers = cachedAtom('ParticipantsMarkers', []);

