namespace MenuOcrEngine.Services;

/// <summary>
/// Publishes events to Redis pub/sub channels for real-time alert delivery.
/// </summary>
public interface IAlertPublisher
{
    /// <summary>
    /// Publishes a notification to the restaurant's alert channel.
    /// Callers should fire-and-forget; any Redis failure is logged and swallowed.
    /// </summary>
    /// <param name="restaurantId">The restaurant whose subscribers should be notified.</param>
    /// <param name="message">A short message payload (e.g., "new_alert").</param>
    Task PublishAsync(Guid restaurantId, string message);
}
