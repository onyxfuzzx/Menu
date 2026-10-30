using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MenuOcrEngine.Data;
using MenuOcrEngine.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Security;

/// <summary>Checks live account membership so deleted/reassigned accounts cannot reuse old tokens.</summary>
public static class AccountTokenValidator
{
    public static string CredentialVersion(string passwordHash) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)));

    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (!Guid.TryParse(principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id))
        {
            context.Fail("Invalid account.");
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var user = await db.Users.AsNoTracking().Include(u => u.Restaurant)
            .SingleOrDefaultAsync(u => u.Id == id, context.HttpContext.RequestAborted);
        if (!IsCurrentAccount(principal!, user)) context.Fail("Account access has changed. Sign in again.");
    }

    public static bool IsCurrentAccount(ClaimsPrincipal principal, User? user)
    {
        if (user is null
            || principal.FindFirst(ClaimTypes.Role)?.Value != user.Role.ToString()
            || principal.FindFirst("RestaurantId")?.Value != (user.RestaurantId?.ToString() ?? "")
            || principal.FindFirst("CredentialVersion")?.Value != CredentialVersion(user.PasswordHash))
            return false;

        return user.Role == UserRole.SuperAdmin
               || (user.RestaurantId is not null && user.Restaurant?.Status == "Active");
    }
}
