using GradeSession.Server.Domain.Grades;

namespace GradeSession.Server.Services.Grades;

public sealed record StudentAssessmentResult(
    GradeOperationStatus Status,
    StudentAssessment? Assessment);