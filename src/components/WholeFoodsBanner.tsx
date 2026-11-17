// Full-bleed giveaway banner under the fixed nav, above the lead carousel.
// The Whole Foods ad art is the dimmed background; the headline sits in front and
// the whole bar links to /whole-foods.
import Link from "next/link";
import Image from "next/image";

export default function WholeFoodsBanner() {
    return (
        <div className="wf-band">
            <Link className="wf-banner" href="/whole-foods" title="Win a free Whole Foods shopping spree">
                <Image
                    className="wf-ad"
                    src="/header/whole-foods-header.webp"
                    alt=""
                    fill
                    sizes="100vw"
                    style={{ objectFit: "cover" }}
                    priority
                />
                <div className="wf-veil" aria-hidden="true" />
                <h3 className="wf-title">Win a Free Whole-Foods Shopping Spree!</h3>
            </Link>
        </div>
    );
}
