using System.ComponentModel.DataAnnotations;

namespace GradeSession.Server.Api.Grades.Contracts;

public sealed record SaveCriterionAssessmentRequest(
    [Required]
    [StringLength(80, MinimumLength = 1)]
    string CriterionId,

    [Range(0, 1000)]
    double? Score);