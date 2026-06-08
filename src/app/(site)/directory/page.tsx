// src/app/directory/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import "./directory.css";

export const metadata: Metadata = {
    title: "The Directory — vegan eating",
    description: "A hand-kept index of the vegan websites, YouTube channels, and blogs worth your time.",
};

type Site = { name: string; url: string };
type Collection = { key: string; label: string; blurb: string; icon: React.ReactNode; links: Site[] };

// NOTE: hrefs are placeholders ("#") — drop in the real URLs from your old
// link list and they'll open in a new tab. Tell me and I can wire the rest.
const L = (name: string, url = "#"): Site => ({ name, url });

const GlobeIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></svg>
);
const PlayIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" /></svg>
);
const PenIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 20l4-1 9-9-3-3-9 9-1 4z" /><path d="M14 7l3 3" /></svg>
);

const collections: Collection[] = [
    {
        key: "websites", label: "Websites", icon: GlobeIcon,
        blurb: "Structured, comprehensive, and reliably worth a bookmark — research, advocacy, and everyday how-to.",
        links: [
            L("FatFree Vegan Kitchen", "http://www.fatfreevegan.com"), L("Post Punk Kitchen", "http://www.theppk.com"),
            L("Chocolate Covered Katie", "https://chocolatecoveredkatie.com"), L("Deliciously Ella", "https://deliciouslyella.com"),
            L("Happy Herbivore", "https://happyherbivore.com"), L("It Doesn't Taste Like Chicken", "https://itdoesnttastelikechicken.com"),
            L("Minimalist Baker", "https://minimalistbaker.com"), L("Oh My Veggies", "https://ohmyveggies.com"),
            L("Oh She Glows", "https://ohsheglows.com"), L("Simple Vegan Blog", "https://simpleveganblog.com"),
            L("The Vegan 8", "https://thevegan8.com"), L("Vegan.Com", "https://vegan.com"),
            L("Vegan Heaven", "https://veganheaven.org"), L("Vegan Yack Attack", "https://veganyackattack.com"),
            L("Connoisseurus Veg", "https://www.connoisseurusveg.com"), L("Love and Lemons", "https://www.loveandlemons.com"),
            L("Pick Up Limes", "https://www.pickuplimes.com"), L("The Full Helping", "https://www.thefullhelping.com"),
            L("Vegan Richa", "https://www.veganricha.com"), L("Veggie Inspired", "https://www.veggieinspired.com"),
        ],
    },
    {
        key: "youtube", label: "YouTube", icon: PlayIcon,
        blurb: "Into the kitchens and lives of vegans around the globe — tutorials, vlogs, and the occasional rant.",
        links: [
            L("Bite Size Vegan", "https://www.youtube.com/user/BiteSizeVegan"), L("Hot for Food", "https://www.youtube.com/user/hotforfoodblog"),
            L("Mic the Vegan", "https://www.youtube.com/c/MictheVegan"), L("The Vegan View", "https://www.youtube.com/c/TheVeganView"),
            L("Jon Venus", "https://www.youtube.com/user/TheQuestForFitness"), L("Cheap Lazy Vegan", "https://www.youtube.com/c/CheapLazyVegan"),
            L("Earthling Ed", "https://www.youtube.com/c/EarthlingEd"), L("The Happy Pear", "https://www.youtube.com/user/happypeargreystones"),
            L("Avant-Garde Vegan", "https://www.youtube.com/c/avantgardevegan"), L("Sustainably Vegan", "https://www.youtube.com/c/sustainablyvegan"),
            L("The Edgy Veg", "https://www.youtube.com/c/edgyveg"), L("Sweet Simple Vegan", "https://www.youtube.com/c/Sweetsimplevegan"),
            L("Eco-Vegan Gal", "https://www.youtube.com/c/ecovegangal"), L("Vegan Gains", "https://www.youtube.com/c/VeganGains"),
            L("Rawvana", "https://www.youtube.com/c/rawvanaenglish"), L("SweetPotatoSoul", "https://www.youtube.com/c/SweetPotatoSoul"),
            L("The Vegan Zombie", "https://www.youtube.com/c/zombiegate"), L("Simnett Nutrition", "https://www.youtube.com/c/SimnettNutrition"),
            L("Sweet Natural Living", "https://www.youtube.com/c/sweetnaturalliving"), L("Mary's Test Kitchen", "https://www.youtube.com/c/Marystestkitchen"),
        ],
    },
    {
        key: "blogs", label: "Blogs", icon: PenIcon,
        blurb: "A personal touch — nutrition, ethics, fashion, and feasts, written by people who actually live it.",
        links: [
            L("Minimalist Baker", "https://minimalistbaker.com/"), L("Oh She Glows", "https://ohsheglows.com/"),
            L("Vegan Richa", "https://www.veganricha.com/"), L("Isa Chandra", "https://www.isachandra.com/"),
            L("The Vegan Stoner", "https://theveganstoner.com/"), L("Veggiekins", "https://veggiekinsblog.com/"),
            L("The Conscientious Eater", "https://theconscientiouseater.com/"), L("My Darling Vegan", "https://www.mydarlingvegan.com/"),
            L("Pickles & Honey", "https://picklesnhoney.com/"), L("It Doesn't Taste Like Chicken", "https://itdoesnttastelikechicken.com/"),
            L("Deliciously Ella", "https://deliciouslyella.com/"), L("Vegan Yack Attack", "https://veganyackattack.com/"),
            L("The First Mess", "https://www.thefirstmess.com/"), L("Vegetarian Ventures", "https://www.vegetarianventures.com/"),
            L("Keepin' It Kind", "https://keepinitkind.com/"), L("Elephantastic Vegan", "https://www.elephantasticvegan.com/"),
            L("The Full Helping", "https://www.thefullhelping.com/"), L("Chocolate Covered Katie", "https://chocolatecoveredkatie.com/"),
            L("Simple Vegan Blog", "https://simpleveganblog.com/"), L("Rawmazing", "https://www.rawmazing.com/"),
        ],
    },
];

export default function DirectoryPage() {
    return (
        <>
            <div className="dir-band">
                <div className="dir-wrap">
                    <span className="dir-kicker">The vegan universe</span>
                    <h1 className="dir-title">The Directory</h1>
                    <p className="dir-sub">A hand-kept index of the people and places worth your time — no affiliate links, no rankings, just the ones we actually read and watch.</p>
                </div>
            </div>

            <div className="dir-wrap dir-intro">
                <p className="dir-lead">
                    Whether you're a seasoned vegan or just dabbling with the idea, this is the shortcut. We've pulled together the channels, blogs, and sites that consistently teach us something — from culinary adventurers to the deeply researched.
                </p>
                <p className="dir-lead-2">Skim a category, follow what clicks, and come argue about your favourites in the <Link href="/forum" className="dir-inline">forum</Link>.</p>
            </div>

            <div className="dir-wrap dir-collections">
                {collections.map((c) => (
                    <section className="dir-collection" key={c.key} id={c.key}>
                        <div className="dir-col-head">
                            <span className="dir-icon">{c.icon}</span>
                            <div>
                                <h2 className="dir-col-title">{c.label} <span className="dir-count">{c.links.length}</span></h2>
                                <p className="dir-col-blurb">{c.blurb}</p>
                            </div>
                        </div>
                        <ul className="dir-links">
                            {c.links.map((l) => (
                                <li key={l.name}>
                                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="dir-link">
                                        <span>{l.name}</span>
                                        <svg className="dir-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8" /></svg>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            <div className="dir-wrap dir-foot">
                <p>Know a gem we're missing? <Link href="/forum" className="dir-inline">Tell us in the forum</Link> and we'll add it.</p>
            </div>
        </>
    );
}