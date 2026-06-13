namespace GradeSession.Server.Api.Results.Contracts;

public sealed record AssessmentSummaryResponse(
    IReadOnlyList<StudentAssessmentSummaryResponse> Assessments);