'use client';

import { useEffect, useState } from 'react';

// The narrow treatment. Both the hover previews and the platter's drag want a
// pointer that can rest somewhere without committing to it, and a phone-width
// column has neither the room nor, usually, the pointer — so here the emblem
// keeps one gesture, a tap on a ray, and the listening moves down to the covers.
//
// Measured off the viewport rather than the hardware, at the same width the
// layout changes over at, so the interactions turn over exactly where the
// columns do and a window dragged narrow behaves the way it looks.
const QUERY = '(max-width: 767.98px)';

// False until the page has mounted: the markup is pre-rendered with no media
// queries to read, and nothing can be tapped before the first paint anyway.
export function useMobile() {
    const [mobile, setMobile] = useState(false);
    useEffect(() => {
        const query = window.matchMedia(QUERY);
        const read = () => setMobile(query.matches);
        read();
        query.addEventListener('change', read);
        return () => query.removeEventListener('change', read);
    }, []);
    return mobile;
}
