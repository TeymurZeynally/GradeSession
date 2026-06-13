using System.ComponentModel.DataAnnotations;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record StudentRequest(
    [Required]
    [StringLength(200, MinimumLength = 1)]
    string FullName,

    [Required]
    [StringLength(80, MinimumLength = 1)]
    string ShortName,

    [Required]
    [StringLength(300, MinimumLength = 1)]
    string Topic,

    [StringLength(1000)]
    string? Comment);