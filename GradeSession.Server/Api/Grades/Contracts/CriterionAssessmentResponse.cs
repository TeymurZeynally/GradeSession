namespace GradeSession.Server.Api.Grades.Contracts;

public sealed record CriterionAssessmentResponse(
    string CriterionId,
    double? Score);