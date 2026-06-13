using GradeSession.Server.Domain.Grades;

namespace GradeSession.Server.Services.Grades;

public sealed record CommitteeSlotAssessmentsResult(
    GradeOperationStatus Status,
    IReadOnlyList<StudentAssessment> Assessments);