using StackExchange.Redis;

namespace MenuOcrEngine.Services;

/// <summary>
/// Publishes waiter-alert events to the Redis pub/sub channel
/// <c>optionc:alerts:{restaurantId}</c>.
///
/// Channel naming convention:
///   optionc:alerts:{restaurantId}  →  published when a new WaiterAlert is created.
///
/// Subscribers (e.g., a future SSE or WebSocket endpoint) can subscribe to this
/// channel to push notifications to the correct restaurant's staff in real time
/// without polling.
///
/// This service degrades gracefully: if Redis is unreachable the publish is
/// silently skipped and a warning is logged, so alert creation never fails.
/// </summary>
public sealed class AlertPublisher : IAlertPublisher
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<AlertPublisher> _logger;

    public AlertPublisher(IConnectionMultiplexer redis, ILogger<AlertPublisher> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task PublishAsync(Guid restaurantId, string message)
    {
        try
        {
            var channel = RedisChannel.Literal($"optionc:alerts:{restaurantId}");
            var sub = _redis.GetSubscriber();
            var receivers = await sub.PublishAsync(channel, message);
            _logger.LogDebug("[REDIS PUB] channel={Channel} message={Message} receivers={Receivers}",
                channel, message, receivers);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "[REDIS PUB ERROR] Failed to publish alert for restaurantId={RestaurantId}. Continuing.",
                restaurantId);
        }
    }
}
