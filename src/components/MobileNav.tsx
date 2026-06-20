// src/components/MobileNav.tsx
"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";

type Ctx = { open: boolean; toggle: () => void; close: () => void; openMenu: () => void };

const MobileNavCtx = createContext<Ctx | null>(null);

/* Safe fallback so the hook never throws if a consumer ends up outside the
   provider (e.g. during isolated component testing). */
export function useMobileNav(): Ctx {
    return (
        useContext(MobileNavCtx) ?? {
            open: false,
            toggle: () => {},
            close: () => {},
            openMenu: () => {},
        }
    );
}

export function MobileNavProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen((o) => !o), []);
    const close = useCallback(() => setOpen(false), []);
    const openMenu = useCallback(() => setOpen(true), []);

    // While the drawer is open: lock background scroll and allow Esc to close.
    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <MobileNavCtx.Provider value={{ open, toggle, close, openMenu }}>
            {children}
        </MobileNavCtx.Provider>
    );
}

const burgerIcon = (open: boolean) => (
    <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {open ? (
            <>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
            </>
        ) : (
            <>
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
            </>
        )}
    </svg>
);

/* Hamburger lives in the top bar but is hidden on desktop via CSS. */
export function MobileNavToggle() {
    const { open, toggle } = useMobileNav();
    return (
        <button
            type="button"
            className="mnav-burger"
            onClick={toggle}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
        >
            {burgerIcon(open)}
        </button>
    );
}