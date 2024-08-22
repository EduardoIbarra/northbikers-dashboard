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
    { id: 'all', title: 'All' },
    { id: "DUAL_SPORT", title: 'Dual Purpose' },
    { id: 'dirt', title: 'Dirt' },
    { id: 'street', title: 'Street' },
    { id: 'female', title: 'Female' },
    { id: 'couple', title: 'Couple' },
  ];
export const GENDERS = [
    {id: 'MALE', title: 'Hombre'},
    {id: 'FEMALE', title: 'Mujer'},
];
