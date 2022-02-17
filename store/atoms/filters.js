import {atom} from "recoil";

export const SearchFiltersState = atom({
    key: 'SearchFiltersState',
    default: {
        model: [],
        make: [],
        year: [],
        color: [],
    }
})