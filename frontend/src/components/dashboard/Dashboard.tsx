import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/shared/PageTransition";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CategoryCard from "./CategoryCard";
import { useMenuStore } from "@/store/menuStore";
import { deleteCategory } from "@/services/api";
import { toast } from "sonner";
import type { CategoryProcessingState } from "@/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const restaurantId = useMenuStore((s) => s.restaurantId);
  const restaurantName = useMenuStore((s) => s.restaurantName);
  const categories = useMenuStore((s) => s.categories);
  const setRestaurantId = useMenuStore((s) => s.setRestaurantId);
  const setRestaurantName = useMenuStore((s) => s.setRestaurantName);
  const addCategory = useMenuStore((s) => s.addCategory);
  const removeCategory = useMenuStore((s) => s.removeCategory);

  const [newName, setNewName] = useState("");

  useEffect(() => {
    // If a RestroAdmin navigates here, ensure their restaurant is selected
    if (user?.role === 'RestroAdmin' && user.restaurantId) {
      if (restaurantId !== user.restaurantId) {
        setRestaurantId(user.restaurantId);
        if (user.restaurantName) {
          setRestaurantName(user.restaurantName);
        }
      }
    }
  }, [user, restaurantId, setRestaurantId, setRestaurantName]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setNewName("");
    navigate(
      `/restaurant/${restaurantId}/category/${encodeURIComponent(trimmed)}`
    );
  };

  const handlePublish = () => {
    // Guard: block if no category has been saved yet
    const savedCategories = categories.filter((c) => c.status === "saved");
    if (savedCategories.length === 0) {
      toast.error("Save at least one category before publishing.");
      return;
    }
    navigate(`/restaurant/${restaurantId}/review`);
  };

  const handleDelete = async (cat: CategoryProcessingState) => {
    if (!window.confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;

    if (cat.dbId) {
      try {
        await deleteCategory(cat.dbId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        toast.error(`Delete failed: ${message}`);
        return;
      }
    }

    removeCategory(cat.id);
    toast.success(`"${cat.name}" deleted`);
  };

  const savedCount = categories.filter((c) => c.status === "saved").length;
  const totalCount = categories.length;
  const allSaved = totalCount > 0 && savedCount === totalCount;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <ScreenHeader title="Menu V1" subtitle="Option-C" />

        <main className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">
          {/* Restaurant */}
          <div className="flex items-center gap-3 bg-white border border-stone-200 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Target Restaurant
              </p>
              <p className="text-base font-bold text-stone-900 truncate mt-0.5">
                {restaurantName || `Restaurant #${restaurantId}`}
              </p>
            </div>
          </div>

          {/* Add Category */}
          <div className="flex gap-2">
            <Input
              placeholder="Category name (e.g. Tandoori)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newName.trim()}>
              Add
            </Button>
          </div>

          {/* Category List */}
          {categories.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-12">
              No categories yet. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  status={cat.status}
                  restaurantId={restaurantId}
                  dbId={cat.dbId}
                  confirmed={cat.confirmed}
                  onDelete={() => handleDelete(cat)}
                />
              ))}
            </div>
          )}

          {/* Progress hint */}
          {totalCount > 0 && !allSaved && (
            <p className="text-xs text-center text-stone-400">
              {savedCount} of {totalCount}{" "}
              {totalCount === 1 ? "category" : "categories"} saved
            </p>
          )}
        </main>

        {/* Floating Publish button */}
        {categories.length > 0 && (
          <div className="fixed bottom-6 left-4 right-4 z-50 max-w-2xl mx-auto">
            <Button
              className="w-full h-12 text-base shadow-lg"
              onClick={handlePublish}
              disabled={savedCount === 0}
            >
              Publish Menu
              {savedCount > 0 && ` (${savedCount}/${totalCount} saved)`}
            </Button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
