namespace MenuOcrEngine.Models;

/// <summary>Key-value store for system settings (e.g. default fallback image URL).</summary>
public class AppSetting
{
    public string Key { get; set; } = null!;
    public string Value { get; set; } = null!;
}
