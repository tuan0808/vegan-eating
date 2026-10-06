// src/components/analytics/RedditPixel.tsx
//
// Loads the Reddit browser pixel once, site-wide, and fires the first PageVisit.
// Mounted in the ROOT layout so `window.rdt` exists on every route group —
// including (auth), where the SignUp conversion fires after the register→login
// redirect. Subsequent client navigations are tracked by RedditRouteTracker.
//
// Renders nothing (and loads nothing) until NEXT_PUBLIC_REDDIT_PIXEL_ID is set,
// so the campaign stays dormant until you paste the id.
"use client";

import Script from "next/script";
import { REDDIT_PIXEL_ID, redditEnabled } from "@/lib/reddit-config";

// Runs inline right after init, before any React effect:
// 1. Persists Reddit's ad click id (rdt_cid, appended to landing URLs) into a
//    first-party cookie so server-side CAPI events can attach it — it would
//    otherwise be lost across navigations and the POST→redirect of a signup.
//    90 days matches Reddit's default click attribution window.
// 2. Fires the entry PageVisit with a conversion id and beacons the same id to
//    /api/reddit-event, which sends the CAPI twin (Reddit de-dupes the pair).
//    Kept inline rather than in an effect so it can't race the snippet.
const ENTRY_PAGE_VISIT = `try{var q=new URLSearchParams(location.search).get('rdt_cid');if(q)document.cookie='rdt_cid='+encodeURIComponent(q)+'; path=/; max-age=7776000; SameSite=Lax'}catch(e){}var c=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'rc_'+Date.now()+'_'+Math.floor(Math.random()*1e9);rdt('track','PageVisit',{conversionId:c});try{var b=JSON.stringify({event:'PageVisit',conversionId:c});navigator.sendBeacon&&navigator.sendBeacon('/api/reddit-event',new Blob([b],{type:'application/json'}))||fetch('/api/reddit-event',{method:'POST',body:b,keepalive:true,headers:{'Content-Type':'application/json'}})}catch(e){}`;

export default function RedditPixel() {
    if (!redditEnabled()) return null;

    return (
        <Script id="reddit-pixel" strategy="afterInteractive">
            {`!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);rdt('init','${REDDIT_PIXEL_ID}');${ENTRY_PAGE_VISIT}`}
        </Script>
    );
}
