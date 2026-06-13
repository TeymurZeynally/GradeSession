using GradeSession.Server.Domain.Grades;

namespace GradeSession.Server.Services.Results;

public sealed record AssessmentSummaryResult(
    ResultOperationStatus Status,
    IReadOnlyList<StudentAssessment> Assessments);