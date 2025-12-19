import { useEffect, useState } from "react";

export function useWindowWidth() {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        function handleResize() {
            setWidth(globalThis.innerWidth);
        }
        handleResize();
        globalThis.addEventListener("resize", handleResize);
        return () => globalThis.removeEventListener("resize", handleResize);
    }, []);

    return width;
}

