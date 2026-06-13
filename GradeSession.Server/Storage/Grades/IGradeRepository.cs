using GradeSession.Server.Domain.Grades;

namespace GradeSession.Server.Storage.Grades;

public interface IGradeRepository
{
    Task<StudentAssessment?> GetStudentAssessmentAsync(string sessionId, string committeeSlotId, string studentId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StudentAssessment>> GetCommitteeSlotAssessmentsAsync(string sessionId, string committeeSlotId, CancellationToken cancellationToken = default);

    Task SaveStudentAssessmentAsync(StudentAssessment assessment, CancellationToken cancellationToken = default);
}