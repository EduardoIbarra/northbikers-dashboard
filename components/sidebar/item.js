import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { FiChevronRight } from 'react-icons/fi'

const Item = ({ url, icon, title, badge, items }) => {
    const [hidden, setHidden] = useState(true)
    const router = useRouter()
    const active = router?.pathname === url;

    if (items.length === 0) {
        return (
            <Link href={url} className={`left-sidebar-item ${active ? 'active' : ''}`}>
                {icon}
                <span className="title">{title}</span>
                {badge && (
                    <span className={`badge badge-circle badge-sm ${badge.color}`}>
                        {badge.text}
                    </span>
                )}
            </Link>

        )
    }
    return (
        <button
            onClick={() => setHidden(!hidden)}
            className={`left-sidebar-item ${active ? 'active' : ''} ${hidden ? 'hidden-sibling' : 'open-sibling'
                }`}>
            {icon}
            <span className="title">{title}</span>
            {badge && (
                <span className={`badge badge-circle badge-sm ${badge.color}`}>
                    {badge.text}
                </span>
            )}
            <FiChevronRight className="ml-auto arrow" />
        </button>
    )
}

export default Item
