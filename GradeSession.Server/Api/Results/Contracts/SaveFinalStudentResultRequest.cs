using System.ComponentModel.DataAnnotations;

namespace GradeSession.Server.Api.Results.Contracts;

public sealed record SaveFinalStudentResultRequest(
    [Required]
    [StringLength(80, MinimumLength = 1)]
    string StudentId,

    [Range(0, 100)]
    double? FinalGrade);