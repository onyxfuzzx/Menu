using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Seed;

public static class DbResetUtility
{
    public static async Task ResetDatabaseAsync(AppDbContext db, ILogger logger)
    {
        logger.LogInformation("Starting complete database reset...");

        // Remove all domain rows using EF Core sets to handle table casing automatically
        db.WaiterAlerts.RemoveRange(db.WaiterAlerts);
        db.TableSessions.RemoveRange(db.TableSessions);
        db.OrderItems.RemoveRange(db.OrderItems);
        db.Orders.RemoveRange(db.Orders);
        db.ValidationLogs.RemoveRange(db.ValidationLogs);
        db.MenuItemPrices.RemoveRange(db.MenuItemPrices);
        db.MenuItems.RemoveRange(db.MenuItems);
        db.MenuSubCategories.RemoveRange(db.MenuSubCategories);
        db.MenuCategories.RemoveRange(db.MenuCategories);
        db.MenuPages.RemoveRange(db.MenuPages);
        db.Restaurants.RemoveRange(db.Restaurants);

        // Remove image funnel user data (Phase 3 & unmatched logs)
        db.Phase3Aliases.RemoveRange(db.Phase3Aliases);
        db.Phase3Images.RemoveRange(db.Phase3Images);
        db.UnmatchedLogs.RemoveRange(db.UnmatchedLogs);

        // Clear all users
        db.Users.RemoveRange(db.Users);

        await db.SaveChangesAsync();

        // Seed SuperAdmin zaid@admin.com with password 12345678
        var adminUser = new User
        {
            Email = "zaid@admin.com",
            Name = "Zaid (Super Admin)",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("12345678"),
            Role = UserRole.SuperAdmin
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();

        logger.LogInformation("Database reset completed. Only zaid@admin.com user remains.");
    }
}
