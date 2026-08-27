using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace MenuOcrEngine.Services;

/// <summary>
/// Redis-backed typed cache with graceful degradation.
/// If Redis is unavailable, all operations degrade silently:
///   - GetAsync returns null (treated as cache miss → falls through to DB).
///   - SetAsync / RemoveAsync are no-ops.
/// This ensures the application never crashes due to a Redis outage.
/// </summary>
public sealed class CacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<CacheService> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public CacheService(IDistributedCache cache, ILogger<CacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<T?> GetAsync<T>(string key) where T : class
    {
        try
        {
            var bytes = await _cache.GetAsync(key);
            if (bytes is null)
            {
                _logger.LogDebug("[CACHE MISS] key={Key}", key);
                return null;
            }

            _logger.LogDebug("[CACHE HIT] key={Key}", key);
            return JsonSerializer.Deserialize<T>(bytes, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[CACHE ERROR] GetAsync failed for key={Key}. Degrading to cache miss.", key);
            return null;
        }
    }

    /// <inheritdoc/>
    public async Task SetAsync<T>(string key, T value, TimeSpan ttl) where T : class
    {
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value, _jsonOptions);
            var options = new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl };
            await _cache.SetAsync(key, bytes, options);
            _logger.LogDebug("[CACHE SET] key={Key} ttl={Ttl}", key, ttl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[CACHE ERROR] SetAsync failed for key={Key}. Continuing without caching.", key);
        }
    }

    /// <inheritdoc/>
    public async Task RemoveAsync(params string[] keys)
    {
        foreach (var key in keys)
        {
            try
            {
                await _cache.RemoveAsync(key);
                _logger.LogDebug("[CACHE EVICT] key={Key}", key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[CACHE ERROR] RemoveAsync failed for key={Key}.", key);
            }
        }
    }
}
