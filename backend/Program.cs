using FluentValidation;
using Microsoft.EntityFrameworkCore;
using MenuOcrEngine.Data;
using MenuOcrEngine.Services;
using MenuOcrEngine.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Serilog;
using StackExchange.Redis;

// ═══════════════════════════════════════════════════════════════
// SERILOG BOOTSTRAP
// ═══════════════════════════════════════════════════════════════
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("Starting Menu OCR Engine API (Option-C)");

    var builder = WebApplication.CreateBuilder(args);

    // ═══════════════════════════════════════════════════════════════
    // SERILOG
    // ═══════════════════════════════════════════════════════════════
    builder.Host.UseSerilog();

    // ═══════════════════════════════════════════════════════════════
    // DATABASE (EF Core + PostgreSQL)
    // ═══════════════════════════════════════════════════════════════
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorCodesToAdd: null);
            }));

    // ═══════════════════════════════════════════════════════════════
    // FLUENT VALIDATION
    // ═══════════════════════════════════════════════════════════════
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    // ═══════════════════════════════════════════════════════════════
    // OPTION-C SERVICES
    // ═══════════════════════════════════════════════════════════════
    builder.Services.AddScoped<IJsonValidator, JsonValidator>();
    builder.Services.AddScoped<IErrorReportFormatter, ErrorReportFormatter>();
    builder.Services.AddScoped<DeduplicationService>();

    // ═══════════════════════════════════════════════════════════════
    // IMAGE NORMALIZATION FUNNEL SERVICES
    // ═══════════════════════════════════════════════════════════════
    // EngineCacheService: singleton in-memory snapshot. RebuildAsync is called
    // at startup and after every Phase 3 mutation. The engine itself is also a
    // singleton because it only reads from the cache (no DB access per request).
    builder.Services.AddSingleton<EngineCacheService>();
    builder.Services.AddSingleton<NormalizationEngineService>();

    // SuggestorService: scoped — needs a DbContext.
    builder.Services.AddScoped<SuggestorService>();

    // S3StorageService: S3-compatible storage service for Supabase S3.
    builder.Services.AddSingleton<IImageStorageService, S3StorageService>();

    // ═══════════════════════════════════════════════════════════════
    // REDIS — distributed cache + pub/sub
    // ═══════════════════════════════════════════════════════════════
    var redisConnectionString = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";
    var redisInstanceName     = builder.Configuration["Redis:InstanceName"] ?? "optionc:";

    // IDistributedCache → used by CacheService for typed cache-aside pattern.
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnectionString;
        options.InstanceName  = redisInstanceName;
    });

    // IConnectionMultiplexer → used by AlertPublisher for pub/sub.
    // abortConnect=false means startup succeeds even if Redis is momentarily unavailable.
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
        ConnectionMultiplexer.Connect($"{redisConnectionString},abortConnect=false"));

    builder.Services.AddSingleton<ICacheService, CacheService>();
    builder.Services.AddSingleton<IAlertPublisher, AlertPublisher>();

    // ═══════════════════════════════════════════════════════════════
    // CONTROLLERS + JSON OPTIONS
    // ═══════════════════════════════════════════════════════════════
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy =
                System.Text.Json.JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
            options.JsonSerializerOptions.DefaultIgnoreCondition =
                System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

    // ═══════════════════════════════════════════════════════════════
    // SWAGGER / OPENAPI
    // ═══════════════════════════════════════════════════════════════
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new()
        {
            Title = "Menu OCR Engine API (Option-C)",
            Version = "v1",
            Description = "Manual JSON copy-paste OCR workflow. User pastes Kimi-extracted JSON → backend validates → saves → builds menu."
        });

        var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath))
            options.IncludeXmlComments(xmlPath);
    });

    // ═══════════════════════════════════════════════════════════════
    // CORS (allow Vite dev origin + all origins for dev)
    // ═══════════════════════════════════════════════════════════════
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            // Option-C frontend: Vite on port 5180
            // Option-B frontend: Vite on port 5173 — no clash by design
            policy.WithOrigins("http://localhost:5180", "https://localhost:5180")
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });

        // Named policy for open dev if needed
        options.AddPolicy("AllowAll", policy =>
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
    });

    // ═══════════════════════════════════════════════════════════════
    // AUTHENTICATION & AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════
    // The JWT secret MUST come from configuration (env var Jwt__Secret,
    // user-secrets, or appsettings). A weak dev-only fallback is allowed
    // ONLY outside Production so local runs work without setup.
    var jwtSecret = builder.Configuration["Jwt:Secret"];
    if (string.IsNullOrWhiteSpace(jwtSecret))
    {
        if (builder.Environment.IsProduction())
            throw new InvalidOperationException("Jwt:Secret is not configured. Set the Jwt__Secret environment variable.");
        jwtSecret = "dev_only_insecure_jwt_secret_key_change_me_1234567890";
        Log.Warning("Jwt:Secret not configured — using an insecure development fallback. DO NOT use in production.");
    }
    if (jwtSecret.Length < 32)
        throw new InvalidOperationException("Jwt:Secret must be at least 32 characters for HMAC-SHA256.");
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false
            };
        });
    builder.Services.AddAuthorization();

    // ═══════════════════════════════════════════════════════════════
    // BUILD APP
    // ═══════════════════════════════════════════════════════════════
    var app = builder.Build();

    // ═══════════════════════════════════════════════════════════════
    // MIDDLEWARE PIPELINE
    // ═══════════════════════════════════════════════════════════════
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "Menu OCR Engine (Option-C) v1");
            options.RoutePrefix = "swagger"; // Swagger UI at /swagger, not clobbering the app root
        });
    }

    app.UseSerilogRequestLogging();
    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    // ═══════════════════════════════════════════════════════════════
    // AUTO-MIGRATE DATABASE
    // ═══════════════════════════════════════════════════════════════
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            await dbContext.Database.MigrateAsync();
            Log.Information("Database migration completed successfully");

            // ── Image Normalization Funnel: Seed Phase 1, Phase 2, FoodItemNames ──
            try
            {
                var seederLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("ImageFunnelSeeder");
                await ImageFunnelSeeder.SeedAsync(dbContext, seederLogger);
            }
            catch (Exception seedEx)
            {
                Log.Warning(seedEx, "Image funnel seeding failed — skipping. Run migration manually if needed.");
            }

            // ── Build the engine cache AFTER seeding ────────────────────────────
            try
            {
                var engineCache = scope.ServiceProvider.GetRequiredService<EngineCacheService>();
                await engineCache.RebuildAsync();
            }
            catch (Exception cacheEx)
            {
                Log.Warning(cacheEx, "Image funnel engine cache rebuild failed at startup.");
            }
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Database migration failed — run 'dotnet ef database update' manually.");
        }
    }

    Log.Information("Menu OCR Engine (Option-C) running on {Urls}", string.Join(", ", app.Urls));
    await app.RunAsync();
}
catch (HostAbortedException)
{
    // EF Core tooling throws this exception intentionally to abort app startup after discovering the DbContext.
    // We can safely ignore it.
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}
