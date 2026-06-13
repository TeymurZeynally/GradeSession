namespace GradeSession.Server.Services.Sessions;

public sealed record CommitteeSlotProgress(
    string CommitteeSlotId,
    string? ClaimedByUserId,
    int TotalStudents,
    int StudentsWithAnyAssessment,
    int CompletedStudents,
    int TotalCriterionScores,
    int FilledCriterionScores,
    int TotalFinalGrades,
    int FilledFinalGrades);