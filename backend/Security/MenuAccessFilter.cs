using MenuOcrEngine.Data;
using MenuOcrEngine.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;

namespace MenuOcrEngine.Security;

/// <summary>Resolves menu resources to their restaurant before any mutation runs.</summary>
public sealed class MenuAccessFilter(AppDbContext db) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() is not null)
        {
            await next();
            return;
        }

        Guid? restaurantId = null;
        var ct = context.HttpContext.RequestAborted;
        if (context.ActionArguments.TryGetValue("catId", out var categoryValue) && categoryValue is Guid categoryId)
        {
            restaurantId = await db.MenuCategories.Where(c => c.Id == categoryId)
                .Select(c => c.MenuPage.RestaurantId).SingleOrDefaultAsync(ct);
        }
        else if (context.ActionArguments.TryGetValue("restaurantId", out var restaurantValue) && restaurantValue is Guid routeId)
        {
            restaurantId = routeId;
        }
        else if (context.ActionArguments.Values.OfType<SaveCategoryRequest>().FirstOrDefault() is { } request)
        {
            restaurantId = request.RestaurantId;
        }
        else
        {
            // Only these two actions intentionally have no persisted target. Fail closed for new writes.
            var action = (context.ActionDescriptor as ControllerActionDescriptor)?.ActionName;
            if (action is "ValidateJson" or "FormatErrors") await next();
            else context.Result = new BadRequestObjectResult(new { message = "A scoped menu resource is required." });
            return;
        }

        var user = context.HttpContext.User;
        var ownsRestaurant = Guid.TryParse(user.FindFirst("RestaurantId")?.Value, out var ownId)
                             && ownId == restaurantId;
        if (restaurantId is null || (!user.IsInRole("SuperAdmin") && !ownsRestaurant)
            || !await db.Restaurants.AnyAsync(r => r.Id == restaurantId && r.Status == "Active", ct))
        {
            context.Result = new NotFoundObjectResult(new { message = "Menu resource not found or restaurant inactive." });
            return;
        }

        await next();
    }
}
