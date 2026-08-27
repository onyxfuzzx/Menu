using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MenuOcrEngine.Models;

/// <summary>
/// Tracks each validation attempt for a category's pasted JSON.
/// Stores correction round number for auditing iterative refinements.
/// </summary>
public class ValidationLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>Name of the category being validated.</summary>
    [Required]
    [MaxLength(500)]
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>The raw JSON string submitted for validation.</summary>
    public string RawJson { get; set; } = string.Empty;

    /// <summary>Whether the validation passed.</summary>
    public bool IsValid { get; set; }

    /// <summary>Serialized validation errors (JSON array).</summary>
    public string? ErrorsJson { get; set; }

    /// <summary>Correction round — starts at 1, increments each time user re-submits after Kimi correction.</summary>
    public int CorrectionRound { get; set; } = 1;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
