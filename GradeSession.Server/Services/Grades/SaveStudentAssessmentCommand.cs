using GradeSession.Server.Domain.Grades;

namespace GradeSession.Server.Services.Grades;

public sealed record SaveStudentAssessmentCommand(
    string SessionId,
    string CommitteeSlotId,
    string StudentId,
    string RequestedByUserId,
    StudentAssessmentPresence Presence,
    IReadOnlyList<SaveCriterionAssessmentCommand> Criteria,
    double? FinalGrade);

public sealed record SaveCriterionAssessmentCommand(
    string CriterionId,
    double? Score);