using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using MenuOcrEngine.Models;

namespace MenuOcrEngine.Data;

/// <summary>
/// Application database context for the Menu OCR Engine (Option-C).
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<MenuPage> MenuPages => Set<MenuPage>();
    public DbSet<MenuCategory> MenuCategories => Set<MenuCategory>();
    public DbSet<MenuSubCategory> MenuSubCategories => Set<MenuSubCategory>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<MenuItemPrice> MenuItemPrices => Set<MenuItemPrice>();
    public DbSet<ValidationLog> ValidationLogs => Set<ValidationLog>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<TableSession> TableSessions => Set<TableSession>();
    public DbSet<WaiterAlert> WaiterAlerts => Set<WaiterAlert>();

    // ── Image Normalization Funnel tables ─────────────────────────────────────
    public DbSet<Phase1Image> Phase1Images => Set<Phase1Image>();
    public DbSet<Phase1CategoryKeyword> Phase1CategoryKeywords => Set<Phase1CategoryKeyword>();
    public DbSet<Phase2Image> Phase2Images => Set<Phase2Image>();
    public DbSet<RootWordSynonym> RootWordSynonyms => Set<RootWordSynonym>();
    public DbSet<Phase3Image> Phase3Images => Set<Phase3Image>();
    public DbSet<Phase3Alias> Phase3Aliases => Set<Phase3Alias>();
    public DbSet<FoodItemName> FoodItemNames => Set<FoodItemName>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<UnmatchedLog> UnmatchedLogs => Set<UnmatchedLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // MenuPage
        modelBuilder.Entity<MenuPage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PageNumber).IsRequired();
            entity.Property(e => e.Status)
                  .HasConversion<string>()
                  .HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        // MenuCategory
        modelBuilder.Entity<MenuCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CategoryName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);

            entity.HasOne(e => e.MenuPage)
                  .WithMany(p => p.Categories)
                  .HasForeignKey(e => e.MenuPageId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // MenuSubCategory
        modelBuilder.Entity<MenuSubCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SubCategoryName).IsRequired().HasMaxLength(500);

            entity.HasOne(e => e.MenuCategory)
                  .WithMany(c => c.SubCategories)
                  .HasForeignKey(e => e.MenuCategoryId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // MenuItem
        modelBuilder.Entity<MenuItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(1000);

            entity.Property(e => e.Badges)
                  .HasConversion(
                      v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null!),
                      v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null!) ?? new List<string>())
                  .Metadata.SetValueComparer(
                      new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                          (c1, c2) => c1 != null && c2 != null && c1.SequenceEqual(c2),
                          c => c != null ? c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())) : 0,
                          c => c != null ? c.ToList() : new List<string>()));

            entity.HasOne(e => e.MenuCategory)
                  .WithMany(c => c.Items)
                  .HasForeignKey(e => e.MenuCategoryId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.MenuSubCategory)
                  .WithMany(sc => sc.Items)
                  .HasForeignKey(e => e.MenuSubCategoryId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // MenuItemPrice
        modelBuilder.Entity<MenuItemPrice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Value).HasColumnType("decimal(10,2)");
            entity.Property(e => e.OriginalPrice).HasColumnType("decimal(10,2)");

            entity.HasOne(e => e.MenuItem)
                  .WithMany(i => i.Prices)
                  .HasForeignKey(e => e.MenuItemId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ValidationLog
        modelBuilder.Entity<ValidationLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CategoryName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // Restaurant
        modelBuilder.Entity<Restaurant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ThemeId).HasDefaultValue("default").HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
        });

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Role).HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Restaurant)
                  .WithMany(r => r.Users)
                  .HasForeignKey(e => e.RestaurantId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Order
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(10,2)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Restaurant)
                  .WithMany()
                  .HasForeignKey(e => e.RestaurantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Session)
                  .WithMany(s => s.Orders)
                  .HasForeignKey(e => e.SessionId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // OrderItem
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.Price).HasColumnType("decimal(10,2)");

            entity.HasOne(e => e.Order)
                  .WithMany(o => o.Items)
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.MenuItem)
                  .WithMany()
                  .HasForeignKey(e => e.MenuItemId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // TableSession
        modelBuilder.Entity<TableSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Restaurant)
                  .WithMany()
                  .HasForeignKey(e => e.RestaurantId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Fast lookup of the open tab for a table.
            entity.HasIndex(e => new { e.RestaurantId, e.TableNumber, e.Status });
        });

        // WaiterAlert
        modelBuilder.Entity<WaiterAlert>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Restaurant)
                  .WithMany()
                  .HasForeignKey(e => e.RestaurantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.RestaurantId, e.Resolved });
        });

        // ── Image Normalization Funnel ────────────────────────────────────────

        modelBuilder.Entity<Phase1Image>(e =>
        {
            e.ToTable("phase1_images");
            e.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<Phase1CategoryKeyword>(e =>
        {
            e.ToTable("phase1_category_keywords");
            e.Property(x => x.Phase1ImageId).HasColumnName("phase1_image_id");
            e.HasIndex(x => x.Keyword);
            e.HasOne(x => x.Phase1Image)
                .WithMany(x => x.Keywords)
                .HasForeignKey(x => x.Phase1ImageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Phase2Image>(e =>
        {
            e.ToTable("phase2_images");
            e.HasIndex(x => x.RootWord).IsUnique();
        });

        modelBuilder.Entity<RootWordSynonym>(e =>
        {
            e.ToTable("root_word_synonyms");
            e.Property(x => x.Phase2ImageId).HasColumnName("phase2_image_id");
            e.HasIndex(x => x.Synonym).IsUnique();
            e.HasOne(x => x.Phase2Image)
                .WithMany(x => x.Synonyms)
                .HasForeignKey(x => x.Phase2ImageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Phase3Image>(e =>
        {
            e.ToTable("phase3_images");
            e.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            e.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Phase3Alias>(e =>
        {
            e.ToTable("phase3_aliases");
            e.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(x => x.Phase3ImageId).HasColumnName("phase3_image_id");
            // UNIQUE across the whole table — one name maps to at most one image.
            e.HasIndex(x => x.AliasNormalized).IsUnique();
            e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(x => x.Phase3Image)
                .WithMany(x => x.Aliases)
                .HasForeignKey(x => x.Phase3ImageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FoodItemName>(e =>
        {
            e.ToTable("food_item_names");
            e.HasIndex(x => x.NameNormalized);
        });

        modelBuilder.Entity<AppSetting>(e =>
        {
            e.ToTable("app_settings");
            e.HasKey(x => x.Key);
        });

        modelBuilder.Entity<UnmatchedLog>(e =>
        {
            e.ToTable("unmatched_logs");
            e.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(x => x.LoggedAt).HasDefaultValueSql("now()");
            // Daily-dedup unique index: (name_normalized, DATE(logged_at))
            // Created via raw SQL in the migration since EF can't express DATE() in an expression index.
        });
    }
}
