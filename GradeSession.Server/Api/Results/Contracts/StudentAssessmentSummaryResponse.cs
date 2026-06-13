using GradeSession.Server.Domain.Grades;

namespace GradeSession.Server.Api.Results.Contracts;

public sealed record StudentAssessmentSummaryResponse(
    string SessionId,
    string StudentId,
    string CommitteeSlotId,
    StudentAssessmentPresence Presence,
    IReadOnlyList<CriterionAssessmentSummaryResponse> Criteria,
    double? FinalGrade,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);