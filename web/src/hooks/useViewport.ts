"use client";

import { useEffect, useState } from "react";

export function useViewport() {
    const [viewport, setViewport] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
    });

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return viewport;
}

export function use2XL() {
    const { width } = useViewport();
    return width >= 1536;
}

export function useXL() {
    const { width } = useViewport();
    return width >= 1280;
}

export function useLG() {
    const { width } = useViewport();
    return width >= 1024;
}

export function useMD() {
    const { width } = useViewport();
    return width >= 768;
}

export function useSM() {
    const { width } = useViewport();
    return width >= 640;
}

export function useXS() {
    const { width } = useViewport();
    return width >= 400;
}
