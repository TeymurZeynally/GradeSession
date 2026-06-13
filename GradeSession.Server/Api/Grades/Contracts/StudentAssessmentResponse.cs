using GradeSession.Server.Domain.Grades;

namespace GradeSession.Server.Api.Grades.Contracts;

public sealed record StudentAssessmentResponse(
    string SessionId,
    string StudentId,
    string CommitteeSlotId,
    StudentAssessmentPresence Presence,
    IReadOnlyList<CriterionAssessmentResponse> Criteria,
    double? FinalGrade,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);