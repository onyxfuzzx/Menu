namespace MenuOcrEngine.Services;

/// <summary>
/// Thin typed wrapper around IDistributedCache.
/// Implementations must degrade gracefully when Redis is unavailable
/// (return null on get, no-op on set/remove).
/// </summary>
public interface ICacheService
{
    /// <summary>Retrieves a cached value. Returns null on cache miss or Redis failure.</summary>
    Task<T?> GetAsync<T>(string key) where T : class;

    /// <summary>Stores a value in the cache with the given TTL.</summary>
    Task SetAsync<T>(string key, T value, TimeSpan ttl) where T : class;

    /// <summary>Removes one or more keys from the cache.</summary>
    Task RemoveAsync(params string[] keys);
}
