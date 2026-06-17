// src/app/(site)/forum/layout.tsx
import ForumStats from "@/components/ForumStats";

export const dynamic = "force-dynamic";
// Wraps every /forum route. Whatever the page renders, the statistics panel
// follows it — so it shows on the index, each board, and each thread.
export default function ForumLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ForumStats />
        </>
    );
}