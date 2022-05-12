export const getUniqueValues  = (source, key) => {
    return [...new Set(source.map((item) => item[key]))];
}

export const setLoggedUser = (user) => {
    localStorage.setItem('logged_user', JSON.stringify(user));
}

export const getLoggedUser = () => {
    const l =   localStorage.getItem('logged_user')
    return l ? JSON.parse(l): null
}

export const CATEGORIES = [
    {id: 'DUAL_SPORT', title: 'Doble Propósito'},
    {id: 'DIRT', title: 'Terracería'},
    {id: 'STREET', title: 'Calle'},
];
export const GENDERS = [
    {id: 'MALE', title: 'Hombre'},
    {id: 'FEMALE', title: 'Mujer'},
];
