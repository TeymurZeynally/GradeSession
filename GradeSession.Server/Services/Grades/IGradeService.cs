namespace GradeSession.Server.Services.Grades;

public interface IGradeService
{
    Task<StudentAssessmentResult> GetStudentAssessmentAsync(string sessionId, string committeeSlotId, string studentId, string requestedByUserId, CancellationToken cancellationToken = default);

    Task<CommitteeSlotAssessmentsResult> GetCommitteeSlotAssessmentsAsync(string sessionId, string committeeSlotId, string requestedByUserId, CancellationToken cancellationToken = default);

    Task<StudentAssessmentResult> SaveStudentAssessmentAsync(SaveStudentAssessmentCommand command, CancellationToken cancellationToken = default);
}