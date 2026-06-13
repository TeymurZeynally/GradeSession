using System.ComponentModel.DataAnnotations;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record SessionSettingsRequest(
    [Range(0, 1000)]
    int? FinalGradeMinScore,

    [Range(0, 1000)]
    int? FinalGradeMaxScore);