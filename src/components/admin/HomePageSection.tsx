// src/components/admin/HomePageSection.tsx
import HomePageControls from "./HomePageControls";
import { getHomeLead } from "@/lib/home-config";
import "./settings.css";

export default async function HomePageSection() {
    const lead = await getHomeLead();

    return (
        <section className="settings-section">
            <div className="settings-section-head">
                <h2>Home page lead</h2>
                <p>
                    Choose what leads the home page. Flip to the recipe banner if the
                    Instagram carousel breaks (e.g. when the Meta API keys expire), then
                    switch back once the feed is healthy again.
                </p>
            </div>
            <HomePageControls initial={lead} />
        </section>
    );
}
