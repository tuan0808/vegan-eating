// src/components/post/PostFooter.tsx
import ShareButtons from "./ShareButtons";
import OtherPosts, { type OtherItem } from "./OtherPosts";
import Comments from "@/components/Comments";
import type { CommentTarget } from "@/lib/comments";

// The shared bottom-of-page stack for recipes, articles, and news, so they stay
// in sync. Styling comes from article-content.css (the .art-* classes), which
// every detail page imports.
//
// commentTarget/commentPath are optional: pages that have a Comment relation
// (recipes, articles) pass them and get the thread; pages that don't yet (news)
// omit them and the comments block is simply skipped.
export default function PostFooter({
                                       tags = [],
                                       shareTitle,
                                       shareNoun = "article",
                                       authorName = "The vegan eating kitchen",
                                       commentTarget,
                                       commentPath,
                                       commentPage,
                                       related,
                                       more,
                                       basePath = "/articles",
                                       otherTitle = "Other posts",
                                       relatedLabel = "Related Articles",
                                       moreLabel = "More from Author",
                                   }: {
    tags?: string[];
    shareTitle: string;
    shareNoun?: string;
    authorName?: string;
    commentTarget?: CommentTarget;
    commentPath?: string;
    commentPage?: number;
    related: OtherItem[];
    more: OtherItem[];
    basePath?: string;
    otherTitle?: string;
    relatedLabel?: string;
    moreLabel?: string;
}) {
    return (
        <>
            <hr className="art-sep" />

            <div className="art-tagsbar">
                <span className="art-tags-label">Tags</span>
                {tags.length > 0 ? (
                    tags.map((t) => <span key={t} className="art-tagchip">{t}</span>)
                ) : (
                    <span className="art-tags-empty">No tags yet</span>
                )}
            </div>

            <ShareButtons title={shareTitle} noun={shareNoun} />

            {/* Static team card — same on every page type. */}
            <div className="art-author">
                <div className="art-author-avatar" />
                <div className="art-author-main">
                    <h4 className="art-author-name">{authorName}</h4>
                    <p className="art-author-bio">
                        Recipes and reads tested in our own kitchen — no plugins, no ads, just plant-based cooking we actually make.
                        Every guide here is written and edited by the vegan eating team.
                    </p>
                    <div className="art-author-links">
                        <a href="#" aria-label="Instagram">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="5" />
                                <circle cx="12" cy="12" r="4" />
                                <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                            </svg>
                        </a>
                        <a href="#" aria-label="Pinterest">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                                <path d="M12 2C6.5 2 4 5.6 4 8.6c0 1.8.7 3.4 2.2 4 .2.1.4 0 .5-.3l.2-.8c.1-.2 0-.3-.1-.5-.4-.5-.7-1.1-.7-2 0-2.6 1.9-4.9 5-4.9 2.7 0 4.2 1.7 4.2 3.9 0 2.9-1.3 5.4-3.2 5.4-1 0-1.8-.9-1.6-1.9.3-1.3.8-2.6.8-3.5 0-.8-.4-1.5-1.3-1.5-1.1 0-1.9 1.1-1.9 2.6 0 .9.3 1.6.3 1.6s-1.1 4.5-1.3 5.3c-.3 1.4 0 3.1 0 3.3 0 .1.2.2.3.1.1-.1 1.5-1.9 2-3.6l.7-2.7c.4.7 1.4 1.3 2.5 1.3 3.3 0 5.6-3 5.6-7.1C20 5.1 16.7 2 12 2z" />
                            </svg>
                        </a>
                        <a href="#" aria-label="Newsletter">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="M3 7l9 6 9-6" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            {commentTarget && commentPath ? (
                <Comments target={commentTarget} path={commentPath} page={commentPage} />
            ) : null}

            <OtherPosts
                related={related}
                author={more}
                basePath={basePath}
                title={otherTitle}
                relatedLabel={relatedLabel}
                authorLabel={moreLabel}
            />
        </>
    );
}