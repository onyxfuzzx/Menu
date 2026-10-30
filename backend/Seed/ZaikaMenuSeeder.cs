using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using MenuOcrEngine.Services;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Seed;

/// <summary>Additive, explicitly invoked test menu; never resets existing restaurant data.</summary>
public static class ZaikaMenuSeeder
{
    public static async Task<(Guid RestaurantId, int AddedItems)> SeedAsync(AppDbContext db, ICacheService cache, ILogger logger)
    {
        var matches = await db.Restaurants.Where(r => r.Name.ToLower().Contains("zaika")).ToListAsync();
        var exact = matches.Where(r => r.Name.Trim().Equals("Zaika", StringComparison.OrdinalIgnoreCase)).ToList();
        var candidates = exact.Count > 0 ? exact : matches;
        if (candidates.Count != 1)
            throw new InvalidOperationException($"Expected one Zaika restaurant; found {candidates.Count}. No menu data was added.");
        var restaurant = candidates[0];
        var pages = await db.MenuPages.Where(p => p.RestaurantId == restaurant.Id)
            .AsSplitQuery()
            .Include(p => p.Categories).ThenInclude(c => c.Items)
            .Include(p => p.Categories).ThenInclude(c => c.SubCategories).ThenInclude(s => s.Items)
            .OrderBy(p => p.PageNumber).ThenBy(p => p.CreatedAt).ToListAsync();
        var page = pages.FirstOrDefault();
        if (page is null)
        {
            page = new MenuPage { Id = Guid.NewGuid(), RestaurantId = restaurant.Id, PageNumber = 1, Status = PageStatus.Completed };
            db.MenuPages.Add(page);
        }

        var allCategories = pages.SelectMany(p => p.Categories).ToList();
        var addedItems = 0;
        foreach (var sample in CreateSampleMenu())
        {
            var existing = allCategories.Where(c => c.CategoryName.Equals(sample.CategoryName, StringComparison.OrdinalIgnoreCase)).ToList();
            if (existing.Count > 1)
                throw new InvalidOperationException($"Multiple categories named '{sample.CategoryName}'. No changes were saved.");
            var category = existing.SingleOrDefault();
            if (category is null)
            {
                sample.SortOrder = allCategories.Count;
                page.Categories.Add(sample);
                allCategories.Add(sample);
                addedItems += CountItems(sample);
                continue;
            }

            // A repeated invocation does not duplicate or overwrite existing menu items.
            var names = category.Items.Concat(category.SubCategories.SelectMany(s => s.Items))
                .Select(i => i.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var item in sample.Items)
                if (names.Add(item.Name)) { item.SortOrder = category.Items.Count; category.Items.Add(item); addedItems++; }
            foreach (var sampleSub in sample.SubCategories)
            {
                var sub = category.SubCategories.FirstOrDefault(s => s.SubCategoryName.Equals(sampleSub.SubCategoryName, StringComparison.OrdinalIgnoreCase));
                foreach (var item in sampleSub.Items.ToList())
                {
                    if (!names.Add(item.Name)) continue;
                    if (sub is null)
                    {
                        sub = new MenuSubCategory { SubCategoryName = sampleSub.SubCategoryName, SortOrder = category.SubCategories.Count };
                        category.SubCategories.Add(sub);
                    }
                    item.SortOrder = sub.Items.Count;
                    sub.Items.Add(item);
                    addedItems++;
                }
            }
        }
        await db.SaveChangesAsync();
        await cache.RemoveAsync($"menu:{restaurant.Id}");
        logger.LogInformation("Zaika sample menu: added {Count} items to {RestaurantName} ({RestaurantId}).", addedItems, restaurant.Name, restaurant.Id);
        return (restaurant.Id, addedItems);
    }

    private static int CountItems(MenuCategory c) => c.Items.Count + c.SubCategories.Sum(s => s.Items.Count);

    public static List<MenuCategory> CreateSampleMenu()
    {
        MenuItem Item(string name, string description, decimal price, string image, bool veg = true, int spice = 0, bool best = false, decimal? large = null) => new()
        {
            Name = name, Description = description, ImageUrl = $"/images/{image}.png", SpiceLevel = spice,
            Badges = best ? new() { veg ? "Veg" : "Non-Veg", "Bestseller" } : new() { veg ? "Veg" : "Non-Veg" },
            Prices = large is null
                ? new List<MenuItemPrice> { new() { Value = price, SortOrder = 0 } }
                : new List<MenuItemPrice> { new() { Label = "Half", Value = price, SortOrder = 0 }, new() { Label = "Full", Value = large.Value, SortOrder = 1 } }
        };
        MenuCategory Category(string name, string emoji, params MenuItem[] items) => new()
        {
            CategoryName = name, Emoji = emoji, Status = CategoryStatus.Confirmed,
            Notes = "Sample menu and prices for testing.", Items = items.ToList()
        };
        var starters = Category("Starters", "🍢");
        starters.SubCategories = new List<MenuSubCategory>
        {
            new() { SubCategoryName = "Vegetarian", SortOrder = 0, Items = new List<MenuItem>
            {
                Item("Paneer Tikka", "Chargrilled paneer with peppers and mint chutney.", 240, "starters/paneer-tikka", spice: 1, best: true),
                Item("Veg Manchurian", "Crisp vegetable dumplings in a tangy sauce.", 190, "starters/veg-manchurian", spice: 2)
            } },
            new() { SubCategoryName = "Non-Vegetarian", SortOrder = 1, Items = new List<MenuItem>
            {
                Item("Chicken Tikka", "Tandoor grilled chicken marinated with yogurt and spices.", 280, "starters/chicken-tikka", false, 2, true),
                Item("Fish Fry", "Crisp spiced fish served with lemon.", 320, "starters/fish-fry", false, 2)
            } }
        };
        var menu = new List<MenuCategory>
        {
            starters,
            Category("Main Course", "🍛",
                Item("Paneer Butter Masala", "Paneer in a creamy tomato and butter gravy.", 260, "main-course/paneer-butter-masala", spice: 1, best: true),
                Item("Dal Tadka", "Yellow lentils tempered with garlic and cumin.", 180, "main-course/dal-tadka", spice: 1),
                Item("Butter Chicken", "Tandoori chicken in a rich tomato cream sauce.", 320, "main-course/butter-chicken", false, 1, true, 560),
                Item("Chicken Curry", "Homestyle chicken curry with aromatic spices.", 280, "main-course/chicken-curry", false, 3, large: 480)),
            Category("Rice & Biryani", "🍚",
                Item("Veg Biryani", "Basmati rice layered with seasonal vegetables.", 220, "rice-biryani/veg-biryani", spice: 1),
                Item("Chicken Biryani", "Dum cooked chicken and fragrant basmati rice.", 280, "rice-biryani/chicken-biryani", false, 2, true),
                Item("Mutton Biryani", "Slow cooked mutton with saffron basmati rice.", 360, "rice-biryani/mutton-biryani", false, 2),
                Item("Jeera Rice", "Steamed basmati rice tempered with cumin.", 140, "rice-biryani/jeera-rice")),
            Category("Breads", "🫓",
                Item("Butter Naan", "Soft tandoor baked naan brushed with butter.", 50, "breads/butter-naan"),
                Item("Garlic Naan", "Naan topped with garlic and coriander.", 65, "breads/garlic-naan", best: true),
                Item("Tandoori Roti", "Whole wheat bread baked in the tandoor.", 30, "breads/tandoori-roti"),
                Item("Lachha Paratha", "Flaky layered whole wheat paratha.", 60, "breads/lachha-paratha")),
            Category("Desserts", "🍮",
                Item("Gulab Jamun", "Two warm milk dumplings in cardamom syrup.", 90, "desserts/gulab-jamun", best: true),
                Item("Ras Malai", "Soft cottage cheese patties in chilled saffron milk.", 120, "desserts/ras-malai"),
                Item("Vanilla Ice Cream", "Two scoops of classic vanilla ice cream.", 80, "desserts/ice-cream"),
                Item("Gulab Jamun with Ice Cream", "Warm gulab jamun with vanilla ice cream.", 150, "desserts/gulab-jamun")),
            Category("Beverages", "🥤",
                Item("Sweet Lassi", "Chilled yogurt drink with a touch of sweetness.", 100, "beverages/lassi"),
                Item("Salted Lassi", "Chilled yogurt blended with salt and roasted cumin.", 90, "beverages/lassi"),
                Item("Masala Chai", "Tea brewed with milk and warming spices.", 40, "beverages/masala-chai"),
                Item("Cold Coffee", "Chilled coffee blended with milk and ice cream.", 120, "beverages/cold-coffee"))
        };
        foreach (var category in menu)
        {
            var index = 0;
            foreach (var item in category.Items) item.SortOrder = index++;
            foreach (var sub in category.SubCategories)
            {
                index = 0;
                foreach (var item in sub.Items) item.SortOrder = index++;
            }
        }
        return menu;
    }
}
