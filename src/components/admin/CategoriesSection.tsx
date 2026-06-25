// src/components/admin/CategoriesSection.tsx
import CategoryEditor from "./CategoryEditor";
import CategorizeRunner from "./CategorizeRunner";
import { getCategories } from "@/lib/category-config";
import "./settings.css";
import "./categories-admin.css";

export default async function CategoriesSection() {
    const cats = await getCategories();

    return (
        <>
            <section className="settings-section">
                <div className="settings-section-head">
                    <h2>Recipe categories</h2>
                    <p>
                        The collections shown on the homepage and the <code>/recipes</code> filter pills.
                        Toggle where each appears, set keywords for the bulk tool, then reorder or add your own.
                    </p>
                </div>
                <CategoryEditor initial={cats} />
            </section>

            <section className="settings-section">
                <div className="settings-section-head">
                    <h2>Bulk categorize</h2>
                    <p>
                        Scan every recipe and assign a category from its title using the keywords above.
                        Preview first — Apply only fills recipes that have no category yet, so manual picks are safe.
                    </p>
                </div>
                <CategorizeRunner />
            </section>
        </>
    );
}
