"use client";

// /links "Register for free" call-to-action. The business-card QR drops new
// visitors on /links; this gives them a one-tap way to create an account right
// there instead of hunting for a sign-up link. The button expands the standard
// registration form inline (only rendered to logged-out visitors).
import { useState } from "react";
import AuthForm from "./AuthForm";
import { registerAction } from "@/app/(auth)/register/actions";

export default function RegisterDisclosure() {
    const [open, setOpen] = useState(false);

    return (
        <div className="links-register">
            {!open && <p className="links-register-note">New here? Set up your free account.</p>}
            <button
                type="button"
                className="links-register-btn"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                {open ? "Maybe later" : "Register for free"}
            </button>

            {open && (
                <div className="links-register-form">
                    <AuthForm
                        mode="register"
                        action={registerAction}
                        heading="Create your free account"
                        subheading="Save recipes, rate what you cook, and join the forum — plus one tested recipe in your inbox each Sunday."
                    />
                </div>
            )}
        </div>
    );
}
