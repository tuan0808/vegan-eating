"use client";
// src/components/SocialIcon.tsx — Font Awesome Free icon for a platform key
// from lib/social-platforms. Client-only because FontAwesomeIcon uses hooks.
import { config, type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faInstagram, faTiktok, faYoutube, faFacebook, faXTwitter, faThreads, faPinterest,
    faBluesky, faLinkedin, faReddit, faSnapchat, faTwitch, faDiscord, faWhatsapp,
    faTelegram, faSpotify, faPatreon, faSubstack, faGithub,
} from "@fortawesome/free-brands-svg-icons";
import { faGlobe, faEnvelope } from "@fortawesome/free-solid-svg-icons";

// The stylesheet is imported once in the root layout; don't inject it again at runtime.
config.autoAddCss = false;

const ICONS: Record<string, IconDefinition> = {
    instagram: faInstagram, tiktok: faTiktok, youtube: faYoutube, facebook: faFacebook,
    x: faXTwitter, threads: faThreads, pinterest: faPinterest, bluesky: faBluesky,
    linkedin: faLinkedin, reddit: faReddit, snapchat: faSnapchat, twitch: faTwitch,
    discord: faDiscord, whatsapp: faWhatsapp, telegram: faTelegram, spotify: faSpotify,
    patreon: faPatreon, substack: faSubstack, github: faGithub,
    email: faEnvelope, website: faGlobe,
};

export default function SocialIcon({ platform, className }: { platform: string; className?: string }) {
    return <FontAwesomeIcon icon={ICONS[platform] ?? faGlobe} className={className} fixedWidth aria-hidden="true" />;
}
