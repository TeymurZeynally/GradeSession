namespace GradeSession.Server.Api.Grades.Contracts;

public sealed record CommitteeSlotAssessmentsResponse(
    IReadOnlyList<StudentAssessmentResponse> Assessments);