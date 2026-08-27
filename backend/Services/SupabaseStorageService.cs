namespace MenuOcrEngine.Services;

/// <summary>
/// Storage abstraction — Supabase Storage now, Cloudflare R2 in a future migration.
/// </summary>
public interface IImageStorageService
{
    /// <summary>Uploads the stream to <paramref name="storagePath"/> (e.g. "phase3/exact-x.jpg") and returns the public URL.</summary>
    Task<string> UploadAsync(Stream stream, string storagePath, string contentType, CancellationToken ct = default);

    Task DeleteAsync(string storagePath, CancellationToken ct = default);
}

/// <summary>
/// Talks to the Supabase Storage REST API with the service-role key.
/// Bucket + credentials come from the "Supabase" config section.
/// </summary>
public class SupabaseStorageService : IImageStorageService
{
    private readonly HttpClient _http;
    private readonly string _bucket;
    private readonly string _baseUrl;

    public SupabaseStorageService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _baseUrl = config["Supabase:Url"]?.TrimEnd('/')
            ?? throw new InvalidOperationException("Supabase:Url is not configured.");
        _bucket = config["Supabase:Bucket"]
            ?? throw new InvalidOperationException("Supabase:Bucket is not configured.");

        var serviceRoleKey = config["Supabase:ServiceRoleKey"]
            ?? throw new InvalidOperationException("Supabase:ServiceRoleKey is not configured.");
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", serviceRoleKey);
    }

    public async Task<string> UploadAsync(Stream stream, string storagePath, string contentType, CancellationToken ct = default)
    {
        using var content = new StreamContent(stream);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
        content.Headers.Add("x-upsert", "true");

        var response = await _http.PostAsync($"{_baseUrl}/storage/v1/object/{_bucket}/{storagePath}", content, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException(
                $"Supabase Storage upload failed ({(int)response.StatusCode}) for '{storagePath}': {body}");
        }

        return $"{_baseUrl}/storage/v1/object/public/{_bucket}/{storagePath}";
    }

    public async Task DeleteAsync(string storagePath, CancellationToken ct = default)
    {
        var response = await _http.DeleteAsync($"{_baseUrl}/storage/v1/object/{_bucket}/{storagePath}", ct);
        // 404 = already gone — treat as success (delete is idempotent).
        if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NotFound)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException(
                $"Supabase Storage delete failed ({(int)response.StatusCode}) for '{storagePath}': {body}");
        }
    }
}
