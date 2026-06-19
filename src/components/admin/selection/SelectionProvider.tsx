// src/components/admin/selection/SelectionProvider.tsx
"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type SelectionCtx = {
    enabled: boolean;
    selected: Set<string>;
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    selectAll: () => void; // selects every id on the current page; toggles off if all already selected
    clear: () => void;
    count: number;
    allIds: string[];
    allSelected: boolean;
};

const Ctx = createContext<SelectionCtx | null>(null);

// Safe to call outside a provider — returns a disabled no-op so row components
// (e.g. a shared checkbox) can render anywhere without crashing.
export function useSelection(): SelectionCtx {
    const ctx = useContext(Ctx);
    if (!ctx) {
        return {
            enabled: false,
            selected: new Set(),
            isSelected: () => false,
            toggle: () => {},
            selectAll: () => {},
            clear: () => {},
            count: 0,
            allIds: [],
            allSelected: false,
        };
    }
    return ctx;
}

/**
 * Generic bulk-selection context, keyed by string id. Drop it around any admin
 * list; pass the current page's ids as `allIds` so "select all" selects what's
 * on screen. Not coupled to news — reuse for recipes, articles, etc.
 */
export default function SelectionProvider({
                                              allIds,
                                              children,
                                          }: {
    allIds: string[];
    children: React.ReactNode;
}) {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggle = useCallback((id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const clear = useCallback(() => setSelected(new Set()), []);

    const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

    const selectAll = useCallback(() => {
        setSelected((prev) => {
            const everySelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
            const next = new Set(prev);
            if (everySelected) allIds.forEach((id) => next.delete(id));
            else allIds.forEach((id) => next.add(id));
            return next;
        });
    }, [allIds]);

    const value = useMemo<SelectionCtx>(
        () => ({
            enabled: true,
            selected,
            isSelected: (id) => selected.has(id),
            toggle,
            selectAll,
            clear,
            count: selected.size,
            allIds,
            allSelected,
        }),
        [selected, toggle, selectAll, clear, allIds, allSelected],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}