using GradeSession.Server.Domain.Grades;
using GradeSession.Server.Domain.Results;
using GradeSession.Server.Domain.Sessions;
using GradeSession.Server.Storage.Grades;
using GradeSession.Server.Storage.Results;
using GradeSession.Server.Storage.Sessions;

namespace GradeSession.Server.Services.Results;

public sealed class ResultService(ISessionRepository sessions, IResultRepository results, IGradeRepository grades) : IResultService
{
    public async Task<AssessmentSummaryResult> GetAssessmentSummaryAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return new AssessmentSummaryResult(ResultOperationStatus.NotFound, []);
        }

        var accessStatus = await CheckReadAccessAsync(sessionId, requestedByUserId, cancellationToken);

        if (accessStatus != ResultOperationStatus.Success)
        {
            return new AssessmentSummaryResult(accessStatus, []);
        }

        if (session.Status != SessionStatus.Closed)
        {
            return new AssessmentSummaryResult(ResultOperationStatus.SessionNotClosed, []);
        }

        var slots = await sessions.GetCommitteeSlotsAsync(sessionId, cancellationToken);
        var committeeMemberSlots = slots.Where(slot => slot.Role == SessionParticipantRole.CommitteeMember).ToArray();
        var assessments = new List<StudentAssessment>();

        foreach (var slot in committeeMemberSlots)
        {
            var slotAssessments = await grades.GetCommitteeSlotAssessmentsAsync(sessionId, slot.Id, cancellationToken);

            assessments.AddRange(slotAssessments);
        }

        return new AssessmentSummaryResult(ResultOperationStatus.Success, assessments);
    }

    public async Task<FinalResultsOperationResult> GetFinalResultsAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var accessStatus = await CheckReadAccessAsync(sessionId, requestedByUserId, cancellationToken);

        if (accessStatus != ResultOperationStatus.Success)
        {
            return new FinalResultsOperationResult(accessStatus, []);
        }

        var finalResults = await results.GetFinalResultsAsync(sessionId, cancellationToken);

        return new FinalResultsOperationResult(ResultOperationStatus.Success, finalResults);
    }

    public async Task<FinalResultsOperationResult> SaveFinalResultsAsync(SaveFinalResultsCommand command, CancellationToken cancellationToken = default)
    {
        var session = await sessions.GetSessionAsync(command.SessionId, cancellationToken);

        if (session is null)
        {
            return new FinalResultsOperationResult(ResultOperationStatus.NotFound, []);
        }

        var accessStatus = await CheckSecretaryAccessAsync(session.Id, command.RequestedByUserId, cancellationToken);

        if (accessStatus != ResultOperationStatus.Success)
        {
            return new FinalResultsOperationResult(accessStatus, []);
        }

        if (session.Status != SessionStatus.Closed)
        {
            return new FinalResultsOperationResult(ResultOperationStatus.SessionNotClosed, []);
        }

        var students = await sessions.GetStudentsAsync(command.SessionId, cancellationToken);
        var studentIds = students.Select(student => student.Id).ToHashSet();

        foreach (var result in command.Results)
        {
            if (!studentIds.Contains(result.StudentId))
            {
                return new FinalResultsOperationResult(ResultOperationStatus.UnknownStudent, []);
            }

            if (result.FinalGrade is not null && (result.FinalGrade < session.Settings.FinalGradeMinScore || result.FinalGrade > session.Settings.FinalGradeMaxScore))
            {
                return new FinalResultsOperationResult(ResultOperationStatus.FinalGradeOutOfRange, []);
            }
        }

        var now = DateTimeOffset.UtcNow;
        var existingResults = await results.GetFinalResultsAsync(command.SessionId, cancellationToken);
        var existingByStudentId = existingResults.ToDictionary(result => result.StudentId);

        var finalResults = command.Results.Select(result =>
        {
            existingByStudentId.TryGetValue(result.StudentId, out var existing);

            return new FinalStudentResult
            {
                SessionId = command.SessionId,
                StudentId = result.StudentId,
                FinalGrade = result.FinalGrade,
                UpdatedByUserId = command.RequestedByUserId,
                CreatedAt = existing?.CreatedAt ?? now,
                UpdatedAt = now
            };
        }).ToArray();

        await results.SaveFinalResultsAsync(command.SessionId, finalResults, cancellationToken);

        return new FinalResultsOperationResult(ResultOperationStatus.Success, finalResults);
    }

    private async Task<ResultOperationStatus> CheckReadAccessAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return ResultOperationStatus.NotFound;
        }

        var participants = await sessions.GetParticipantsByUserAsync(sessionId, requestedByUserId, cancellationToken);

        if (participants.Count == 0)
        {
            return ResultOperationStatus.Forbidden;
        }

        return ResultOperationStatus.Success;
    }

    private async Task<ResultOperationStatus> CheckSecretaryAccessAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return ResultOperationStatus.NotFound;
        }

        var participants = await sessions.GetParticipantsByUserAsync(sessionId, requestedByUserId, cancellationToken);

        if (participants.Any(participant => participant.Role == SessionParticipantRole.Secretary))
        {
            return ResultOperationStatus.Success;
        }

        return ResultOperationStatus.Forbidden;
    }
}