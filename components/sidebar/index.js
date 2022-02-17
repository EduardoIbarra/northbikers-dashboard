import React from 'react'
import Item from './item'
import Logo from './logo'
import {routes} from "../../utils/routes";

const Sidebar = () => {

    return (
        <div className="left-sidebar left-sidebar-1">
            <Logo/>
            <ul>
                {routes.map((i) => {
                    return (
                        <li key={i.url} className="l0"> {/* If nested items change increase classname to l1, l2, l3, ...etc   */}
                            <Item {...i}  />
                        </li>
                    )
                })}

            </ul>
        </div>
    )
}

export default Sidebar
