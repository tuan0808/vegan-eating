// src/app/(app)/profile/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { myProfileRecord } from "@/lib/community";
import { updateProfile } from "@/lib/actions/community";
import "@/styles/community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your profile — vegan eating" };

export default async function ProfileEditorPage() {
    const session = await requireUser();
    const me = await myProfileRecord(session.id);
    if (!me) return null;

    return (
        <div className="cm">
            <p className="cm-kicker">Profile</p>
            <h1 className="cm-h1">Your public profile</h1>
            <p className="cm-sub">
                This is what other members see at{" "}
                <Link href={`/u/${me.username}`} style={{ color: "var(--accent,#5b6b3f)", fontWeight: 600 }}>
                    /u/{me.username}
                </Link>
                . Everything here is optional.
            </p>

            <form action={updateProfile} className="cm-form">
                <p className="hint" style={{ margin: "0 0 4px" }}>
                    Your name is set in{" "}
                    <a href="/settings" style={{ color: "var(--accent,#5b6b3f)", fontWeight: 600 }}>account settings</a>.
                </p>

                <div className="cm-field">
                    <label htmlFor="avatarUrl">Avatar URL</label>
                    <input
                        id="avatarUrl"
                        name="avatarUrl"
                        className="cm-input"
                        defaultValue={me.avatarUrl ?? ""}
                        placeholder="/uploads/avatars/you.jpg or https://…"
                        maxLength={400}
                    />
                </div>

                <div className="cm-field">
                    <label htmlFor="bio">Bio</label>
                    <textarea id="bio" name="bio" className="cm-textarea" defaultValue={me.bio ?? ""} maxLength={600} />
                </div>

                <div className="cm-field">
                    <label htmlFor="location">Location</label>
                    <input
                        id="location"
                        name="location"
                        className="cm-input"
                        defaultValue={me.location ?? ""}
                        maxLength={120}
                    />
                </div>

                <div className="cm-field">
                    <label htmlFor="website">Website</label>
                    <input
                        id="website"
                        name="website"
                        className="cm-input"
                        defaultValue={me.website ?? ""}
                        placeholder="example.com"
                        maxLength={200}
                    />
                </div>

                <label className="cm-check">
                    <input type="checkbox" name="showActivity" defaultChecked={me.showActivity} />
                    <span>
            Show my forum activity (topic count, post count, recent topics) on my public profile.
          </span>
                </label>

                <button type="submit" className="cm-btn">
                    Save profile
                </button>
            </form>
        </div>
    );
}