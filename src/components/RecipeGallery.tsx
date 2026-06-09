// src/components/RecipeGallery.tsx
import "./recipe-gallery.css";

// Normalise a bare path ("2025/01/x.jpg" -> "/2025/01/x.jpg").
function imgSrc(s: string): string {
    const v = (s || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

export default function RecipeGallery({ images, title }: { images: string[]; title: string }) {
    const pics = (images || []).map(imgSrc).filter(Boolean);
    if (pics.length === 0) return null; // nothing to show -> render nothing

    const layout = pics.length === 1 ? "solo" : pics.length === 2 ? "duo" : "grid";

    return (
        <section className="recipe-gallery">
            <div className="rg-head">
                <span className="rg-kicker">From the kitchen</span>
                <span className="rg-rule" />
                <span className="rg-count">{pics.length} photo{pics.length === 1 ? "" : "s"}</span>
            </div>
            <div className={`rg-frames rg-${layout}`}>
                {pics.map((src, i) => (
                    <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noopener"
                        className="rg-frame"
                        aria-label={`${title} — open photo ${i + 1}`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`${title} — photo ${i + 1}`} loading="lazy" />
                    </a>
                ))}
            </div>
        </section>
    );
}