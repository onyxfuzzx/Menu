using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

namespace MenuOcrEngine.Security;

public static class SecurityExtensions
{
    public static IServiceCollection AddMenuSecurity(this IServiceCollection services, string? secret)
    {
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32 || secret.StartsWith("REPLACE_"))
            throw new InvalidOperationException("Configure Jwt:Secret with a random secret of at least 32 characters.");

        services.AddScoped<MenuAccessFilter>();
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.Events = new JwtBearerEvents { OnTokenValidated = AccountTokenValidator.ValidateAsync };
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };
        });
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
        });
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            foreach (var (name, permits) in new[] { ("login", 10), ("waiter-call", 20), ("normalization", 60) })
                options.AddPolicy(name, context => RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = permits, Window = TimeSpan.FromMinutes(1), QueueLimit = 0
                    }));
        });
        return services;
    }
}
