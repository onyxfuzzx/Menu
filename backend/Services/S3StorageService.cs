using Amazon.S3;
using Amazon.S3.Model;

namespace MenuOcrEngine.Services;

/// <summary>
/// Image storage implementation powered by Amazon.S3 SDK for Supabase S3,
/// with automatic local disk fallback for resilience.
/// </summary>
public class S3StorageService : IImageStorageService
{
    private readonly string _bucket;
    private readonly string _publicBaseUrl;
    private readonly ILogger<S3StorageService> _logger;
    private readonly IAmazonS3? _s3Client;

    public S3StorageService(IConfiguration config, ILogger<S3StorageService> logger)
    {
        _logger = logger;

        var serviceUrl = config["Storage:S3:ServiceUrl"] ?? "https://monroaasdcesxkiagabs.storage.supabase.co/storage/v1/s3";
        if (!serviceUrl.EndsWith("/")) serviceUrl += "/";

        var accessKey = config["Storage:S3:AccessKeyId"] ?? "c967e9ce05763304187ea963adf9dbd0";
        var secretKey = config["Storage:S3:SecretAccessKey"] ?? "8fa6b544b9d11785509cb25d0ed5d846b413b8bd2ba26ee48a6c4a9ac0e67d60";
        _bucket = config["Storage:S3:Bucket"] ?? "food-images";

        var projectRef = "monroaasdcesxkiagabs";
        _publicBaseUrl = (config["Storage:S3:PublicBaseUrl"] ?? $"https://{projectRef}.supabase.co/storage/v1/object/public/{_bucket}").TrimEnd('/');

        try
        {
            var s3Config = new AmazonS3Config
            {
                ServiceURL = serviceUrl,
                ForcePathStyle = true,
                AuthenticationRegion = "ap-northeast-1"
            };
            _s3Client = new AmazonS3Client(accessKey, secretKey, s3Config);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to initialize AmazonS3Client, local fallback active.");
        }
    }

    public async Task<string> UploadAsync(Stream stream, string storagePath, string contentType, CancellationToken ct = default)
    {
        var key = storagePath.TrimStart('/');

        using var bytesStream = new MemoryStream();
        await stream.CopyToAsync(bytesStream, ct);

        if (_s3Client != null)
        {
            try
            {
                bytesStream.Position = 0;
                var request = new PutObjectRequest
                {
                    BucketName = _bucket,
                    Key = key,
                    InputStream = bytesStream,
                    ContentType = contentType,
                    AutoCloseStream = false
                };
                await _s3Client.PutObjectAsync(request, ct);
                var publicUrl = $"{_publicBaseUrl}/{key}";
                _logger.LogInformation("Supabase S3 upload successful -> {PublicUrl}", publicUrl);
                return publicUrl;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Supabase S3 upload failed for {Key}. Using local fallback...", key);
            }
        }

        // Local Fallback Storage
        var localDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", Path.GetDirectoryName(key) ?? "");
        Directory.CreateDirectory(localDir);
        var localFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", key);

        bytesStream.Position = 0;
        using (var fs = new FileStream(localFilePath, FileMode.Create, FileAccess.Write))
        {
            await bytesStream.CopyToAsync(fs, ct);
        }

        var localUrl = $"/uploads/{key}";
        _logger.LogInformation("Saved file to local fallback storage -> {LocalUrl}", localUrl);
        return localUrl;
    }

    public async Task DeleteAsync(string storagePath, CancellationToken ct = default)
    {
        var key = storagePath.TrimStart('/');

        if (_s3Client != null)
        {
            try
            {
                var request = new DeleteObjectRequest { BucketName = _bucket, Key = key };
                await _s3Client.DeleteObjectAsync(request, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Supabase S3 delete failed for {Key}", key);
            }
        }

        var localFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", key);
        if (File.Exists(localFilePath))
        {
            File.Delete(localFilePath);
            _logger.LogInformation("Deleted local fallback file -> {LocalFilePath}", localFilePath);
        }
    }
}
