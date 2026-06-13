namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record CommitteeSlotProgressResponse(
    string CommitteeSlotId,
    string? ClaimedByUserId,
    int TotalStudents,
    int StudentsWithAnyAssessment,
    int CompletedStudents,
    int TotalCriterionScores,
    int FilledCriterionScores,
    int TotalFinalGrades,
    int FilledFinalGrades);