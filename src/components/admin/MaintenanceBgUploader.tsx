// src/components/admin/MaintenanceBgUploader.tsx
import { getMaintenance } from "@/lib/maintenance";
import { uploadMaintenanceBg, clearMaintenanceBg } from "@/lib/actions/maintenance";

export default async function MaintenanceBgUploader() {
    const { bgUrl } = await getMaintenance();

    return (
        <div className="mc-bg">
            <div className="mc-bg-head">
                <div className="mc-row-title">Background image</div>
                <div className="mc-row-sub">Shown full-screen behind the holding page. JPG or PNG, up to 8 MB.</div>
            </div>

            {bgUrl ? (
                <div className="mc-bg-preview">
                    <img src={bgUrl} alt="Current maintenance background" />
                </div>
            ) : (
                <div className="mc-bg-empty">No image set — a soft oat gradient shows by default.</div>
            )}

            <div className="mc-bg-actions">
                <form action={uploadMaintenanceBg}>
                    <input type="file" name="file" accept="image/*" required className="mc-file" />
                    <button type="submit" className="mc-save">Upload</button>
                </form>
                {bgUrl ? (
                    <form action={clearMaintenanceBg}>
                        <button type="submit" className="mc-remove">Remove</button>
                    </form>
                ) : null}
            </div>
        </div>
    );
}