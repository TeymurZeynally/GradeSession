using GradeSession.Server.Domain.Grades;
using GradeSession.Server.Storage.Cache;

namespace GradeSession.Server.Storage.Grades;

public sealed class GradeRepository(ICacheStore cache) : IGradeRepository
{
    public Task<StudentAssessment?> GetStudentAssessmentAsync(string sessionId, string committeeSlotId, string studentId, CancellationToken cancellationToken = default)
    {
        return cache.GetAsync<StudentAssessment>(CacheKeyBuilder.StudentAssessment(sessionId, committeeSlotId, studentId), cancellationToken);
    }

    public async Task<IReadOnlyList<StudentAssessment>> GetCommitteeSlotAssessmentsAsync(string sessionId, string committeeSlotId, CancellationToken cancellationToken = default)
    {
        var studentIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.CommitteeSlotAssessmentStudentIds(sessionId, committeeSlotId), cancellationToken) ?? [];
        var assessments = new List<StudentAssessment>();

        foreach (var studentId in studentIds)
        {
            var assessment = await GetStudentAssessmentAsync(sessionId, committeeSlotId, studentId, cancellationToken);

            if (assessment is not null)
            {
                assessments.Add(assessment);
            }
        }

        return assessments;
    }

    public async Task SaveStudentAssessmentAsync(StudentAssessment assessment, CancellationToken cancellationToken = default)
    {
        var committeeSlotIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionAssessmentCommitteeSlotIds(assessment.SessionId), cancellationToken) ?? [];

        if (!committeeSlotIds.Contains(assessment.CommitteeSlotId))
        {
            committeeSlotIds.Add(assessment.CommitteeSlotId);
        }

        var studentIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.CommitteeSlotAssessmentStudentIds(assessment.SessionId, assessment.CommitteeSlotId), cancellationToken) ?? [];

        if (!studentIds.Contains(assessment.StudentId))
        {
            studentIds.Add(assessment.StudentId);
        }

        await cache.SetAsync(CacheKeyBuilder.SessionAssessmentCommitteeSlotIds(assessment.SessionId), committeeSlotIds, cancellationToken);
        await cache.SetAsync(CacheKeyBuilder.CommitteeSlotAssessmentStudentIds(assessment.SessionId, assessment.CommitteeSlotId), studentIds, cancellationToken);
        await cache.SetAsync(CacheKeyBuilder.StudentAssessment(assessment.SessionId, assessment.CommitteeSlotId, assessment.StudentId), assessment, cancellationToken);
    }
}