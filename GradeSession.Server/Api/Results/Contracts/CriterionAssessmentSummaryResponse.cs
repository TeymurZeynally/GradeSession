namespace GradeSession.Server.Api.Results.Contracts;

public sealed record CriterionAssessmentSummaryResponse(
    string CriterionId,
    double? Score);