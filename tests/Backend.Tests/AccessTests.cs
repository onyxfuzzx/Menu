using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MenuOcrEngine.Controllers;
using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using MenuOcrEngine.Security;
using MenuOcrEngine.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace Backend.Tests;

public sealed class AccessTests : IAsyncLifetime
{
    private WebApplication app = null!;
    private HttpClient client = null!;
    private readonly Guid restaurantId = Guid.NewGuid();
    private readonly Guid foreignRestaurantId = Guid.NewGuid();
    private readonly Guid categoryId = Guid.NewGuid();
    private readonly Guid foreignCategoryId = Guid.NewGuid();

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
        builder.WebHost.UseTestServer();
        builder.Configuration["Jwt:Secret"] = "security-tests-only-unique-secret-at-least-32-characters";
        builder.Services.AddMenuSecurity(builder.Configuration["Jwt:Secret"]);
        // One options instance/database per host, shared by request scopes.
        var dbName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(dbName));
        builder.Services.AddControllers().AddApplicationPart(typeof(MenuOcrController).Assembly);
        builder.Services.AddScoped<IJsonValidator, JsonValidator>();
        builder.Services.AddScoped<IErrorReportFormatter, ErrorReportFormatter>();
        builder.Services.AddScoped<DeduplicationService>();
        builder.Services.AddSingleton<EngineCacheService>();
        builder.Services.AddSingleton<NormalizationEngineService>();
        builder.Services.AddSingleton<ICacheService, TestCache>();
        builder.Services.AddSingleton<IAlertPublisher, TestPublisher>();
        app = builder.Build();
        app.UseAuthentication();
        app.UseRateLimiter();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        client = app.GetTestClient();
        await UpdateDb(async db =>
        {
            foreach (var id in new[] { restaurantId, foreignRestaurantId })
            {
                db.Restaurants.Add(new Restaurant { Id = id, Name = "Test restaurant" });
                db.MenuPages.Add(new MenuPage
                {
                    Id = Guid.NewGuid(), RestaurantId = id, PageNumber = 1,
                    Categories = new List<MenuCategory>
                    {
                        new() { Id = id == restaurantId ? categoryId : foreignCategoryId, CategoryName = "Starters" }
                    }
                });
            }
            foreach (var role in new[] { UserRole.SuperAdmin, UserRole.RestroAdmin, UserRole.Chef, UserRole.Waiter })
                db.Users.Add(new User
                {
                    Email = $"{role}@test.invalid", Name = role.ToString(), Role = role,
                    RestaurantId = role == UserRole.SuperAdmin ? null : restaurantId,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("test-password", 4)
                });
            await db.SaveChangesAsync();
        });
    }

    public async Task DisposeAsync() { client.Dispose(); await app.DisposeAsync(); }

    private async Task UpdateDb(Func<AppDbContext, Task> action)
    {
        await using var scope = app.Services.CreateAsyncScope();
        await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private async Task Login(UserRole role)
    {
        client.DefaultRequestHeaders.Authorization = null;
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email = $"{role}@test.invalid", password = "test-password" });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", json.GetProperty("token").GetString());
    }

    [Theory]
    [InlineData("POST", "validate-json")]
    [InlineData("POST", "save-category")]
    [InlineData("POST", "format-errors")]
    [InlineData("PUT", "categories/{category}/sync")]
    [InlineData("PUT", "categories/{category}/confirm")]
    [InlineData("DELETE", "categories/{category}")]
    [InlineData("POST", "categories/{category}/items")]
    [InlineData("PUT", "categories/{category}/items/{item}")]
    [InlineData("DELETE", "categories/{category}/items/{item}")]
    [InlineData("PUT", "restaurant/{restaurant}/settings")]
    public async Task EveryMenuWriteRequiresAuthentication(string method, string path)
    {
        path = path.Replace("{category}", categoryId.ToString()).Replace("{restaurant}", restaurantId.ToString()).Replace("{item}", Guid.NewGuid().ToString());
        using var request = new HttpRequestMessage(new HttpMethod(method), "/api/menu/" + path) { Content = JsonContent.Create(new { }) };
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(request)).StatusCode);
    }

    [Theory]
    [InlineData(UserRole.Chef)]
    [InlineData(UserRole.Waiter)]
    public async Task StaffCannotEditMenu(UserRole role)
    {
        await Login(role);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PutAsJsonAsync($"/api/menu/restaurant/{restaurantId}/settings", new { themeId = "dark" })).StatusCode);
    }

    [Fact]
    public async Task AdminCanEditOwnRestaurantButNotForeignResources()
    {
        await Login(UserRole.RestroAdmin);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/menu/restaurant/{restaurantId}/settings", new { themeId = "dark" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/menu/restaurant/{foreignRestaurantId}/settings", new { themeId = "dark" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/menu/categories/{foreignCategoryId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/menu/categories/{categoryId}/confirm", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/menu/validate-json", new { json = "{}", categoryName = "Starters" })).StatusCode);
    }

    [Fact]
    public async Task SuperAdminCanEditOtherRestaurantsButCannotImplicitlyCreateOne()
    {
        await Login(UserRole.SuperAdmin);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/menu/restaurant/{foreignRestaurantId}/settings", new { themeId = "dark" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/menu/restaurant/{Guid.NewGuid()}/settings", new { themeId = "dark" })).StatusCode);
    }

    [Fact]
    public async Task LoginAttemptsAreRateLimited()
    {
        for (var i = 0; i < 10; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", new { email = "missing@test.invalid", password = "wrong" })).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/auth/login", new { email = "missing@test.invalid", password = "wrong" })).StatusCode);
    }

    [Fact]
    public async Task DeletedStaffTokenIsRejected()
    {
        await Login(UserRole.Waiter);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/orders")).StatusCode);
        await UpdateDb(async db => { db.Users.Remove(await db.Users.SingleAsync(u => u.Role == UserRole.Waiter)); await db.SaveChangesAsync(); });
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/orders")).StatusCode);
    }

    [Theory]
    [InlineData("password")]
    [InlineData("role")]
    [InlineData("restaurant")]
    public async Task ChangedAccountInvalidatesExistingToken(string change)
    {
        await Login(UserRole.RestroAdmin);
        await UpdateDb(async db =>
        {
            var user = await db.Users.SingleAsync(u => u.Role == UserRole.RestroAdmin);
            if (change == "password") user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("changed", 4);
            if (change == "role") user.Role = UserRole.Chef;
            if (change == "restaurant") user.RestaurantId = foreignRestaurantId;
            await db.SaveChangesAsync();
        });
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/orders")).StatusCode);
    }

    [Fact]
    public async Task SuspensionBlocksWarmPublicMenuLoginExistingTokenAndWaiterCalls()
    {
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/menu/build-menu/{restaurantId}", null)).StatusCode);
        await Login(UserRole.Waiter);
        await UpdateDb(async db => { (await db.Restaurants.FindAsync(restaurantId))!.Status = "Inactive"; await db.SaveChangesAsync(); });
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/orders")).StatusCode);
        client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync($"/api/menu/build-menu/{restaurantId}", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/alerts/call-waiter", new { restaurantId, tableNumber = "1" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", new { email = "Waiter@test.invalid", password = "test-password" })).StatusCode);
    }

    private sealed class TestCache : ICacheService
    {
        private readonly Dictionary<string, object> entries = new();
        public Task<T?> GetAsync<T>(string key) where T : class => Task.FromResult(entries.GetValueOrDefault(key) as T);
        public Task SetAsync<T>(string key, T value, TimeSpan ttl) where T : class { entries[key] = value; return Task.CompletedTask; }
        public Task RemoveAsync(params string[] keys) { foreach (var key in keys) entries.Remove(key); return Task.CompletedTask; }
    }
    private sealed class TestPublisher : IAlertPublisher
    {
        public Task PublishAsync(Guid restaurantId, string message) => Task.CompletedTask;
    }
}
