import {AiFillCar, AiFillHdd, AiFillHome, AiOutlineSearch} from "react-icons/ai";
import React from "react";
import {BsFillPeopleFill} from "react-icons/bs";

export const routes = [
    {
        url: '/',
        icon: <AiFillHome size={18}/>,
        title: 'Dashboard',
        badge: null,
        items: []
    },
    {
        url: '/participants',
        icon: <BsFillPeopleFill size={18}/>,
        title: 'Participantes',
        badge: null,
        items: []
    },
    {
        url: '/routes',
        icon: <BsFillPeopleFill size={18}/>,
        title: 'Rutas',
        badge: null,
        items: []
    },
]
