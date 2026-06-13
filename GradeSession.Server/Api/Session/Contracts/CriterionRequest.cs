using System.ComponentModel.DataAnnotations;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record CriterionRequest(
    [Required]
    [StringLength(160, MinimumLength = 1)]
    string Title,

    [StringLength(1000)]
    string? Description,

    [Range(0, 1000)]
    int? MinScore,

    [Range(0, 1000)]
    int? MaxScore,

    [Range(typeof(decimal), "0.01", "100")]
    decimal? Weight);