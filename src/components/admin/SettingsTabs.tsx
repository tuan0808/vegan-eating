// src/components/admin/SettingsTabs.tsx
"use client";

// Client tab bar for the (long) Site settings page. Receives each section as a
// child (server-rendered) and shows only the active one — inactive panes stay
// mounted (hidden) so their form state survives tab switches.
import { Children, useState, type ReactNode } from "react";

export default function SettingsTabs({ labels, children }: { labels: string[]; children: ReactNode }) {
    const [active, setActive] = useState(0);
    const panes = Children.toArray(children);

    return (
        <div>
            <div className="settings-tabs" role="tablist">
                {labels.map((label, i) => (
                    <button
                        key={label}
                        type="button"
                        role="tab"
                        aria-selected={i === active}
                        className={`settings-tab${i === active ? " on" : ""}`}
                        onClick={() => setActive(i)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {panes.map((pane, i) => (
                <div key={i} hidden={i !== active}>
                    {pane}
                </div>
            ))}
        </div>
    );
}
