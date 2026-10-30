using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using MenuOcrEngine.Seed;
using MenuOcrEngine.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Backend.Tests;

public sealed class ZaikaMenuSeederTests
{
    [Fact]
    public async Task SeedAdds24ItemsOnlyOnceAndPreservesExistingDishesAndOtherRestaurants()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var zaika = new Restaurant { Name = "Zaika" };
        var other = new Restaurant { Name = "Other restaurant" };
        db.Restaurants.AddRange(zaika, other);
        var existing = new MenuItem { Name = "House Special", Prices = new List<MenuItemPrice> { new() { Value = 199 } } };
        db.MenuPages.Add(new MenuPage
        {
            RestaurantId = zaika.Id,
            Categories = new List<MenuCategory> { new() { CategoryName = "Main Course", Items = new List<MenuItem> { existing } } }
        });
        await db.SaveChangesAsync();
        var cache = new RecordingCache();

        var first = await ZaikaMenuSeeder.SeedAsync(db, cache, NullLogger.Instance);
        var second = await ZaikaMenuSeeder.SeedAsync(db, cache, NullLogger.Instance);

        Assert.Equal(24, first.AddedItems);
        Assert.Equal(0, second.AddedItems);
        Assert.Equal(25, await db.MenuItems.CountAsync());
        Assert.Equal(6, await db.MenuCategories.CountAsync());
        Assert.Equal(199m, (await db.MenuItems.Include(i => i.Prices).SingleAsync(i => i.Id == existing.Id)).Prices.Single().Value);
        Assert.False(await db.MenuPages.AnyAsync(p => p.RestaurantId == other.Id));
        Assert.Equal($"menu:{zaika.Id}", cache.LastEvicted);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public async Task MissingOrAmbiguousZaikaDoesNotWriteMenuData(int count)
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        for (var i = 0; i < count; i++) db.Restaurants.Add(new Restaurant { Name = "Zaika" });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => ZaikaMenuSeeder.SeedAsync(db, new RecordingCache(), NullLogger.Instance));
        Assert.Equal(0, await db.MenuItems.CountAsync());
        Assert.Equal(0, await db.MenuPages.CountAsync());
    }

    private sealed class RecordingCache : ICacheService
    {
        public string? LastEvicted { get; private set; }
        public Task<T?> GetAsync<T>(string key) where T : class => Task.FromResult<T?>(null);
        public Task SetAsync<T>(string key, T value, TimeSpan ttl) where T : class => Task.CompletedTask;
        public Task RemoveAsync(params string[] keys) { LastEvicted = keys.Single(); return Task.CompletedTask; }
    }
}
