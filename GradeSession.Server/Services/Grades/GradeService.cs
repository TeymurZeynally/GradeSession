using GradeSession.Server.Domain.Grades;
using GradeSession.Server.Domain.Sessions;
using GradeSession.Server.Storage.Grades;
using GradeSession.Server.Storage.Sessions;

namespace GradeSession.Server.Services.Grades;

public sealed class GradeService(IGradeRepository grades, ISessionRepository sessions) : IGradeService
{
    public async Task<StudentAssessmentResult> GetStudentAssessmentAsync(string sessionId, string committeeSlotId, string studentId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return new StudentAssessmentResult(GradeOperationStatus.NotFound, null);
        }

        if (session.Status == SessionStatus.Closed)
        {
            return new StudentAssessmentResult(GradeOperationStatus.SessionClosed, null);
        }

        var access = await GetCommitteeAccessAsync(sessionId, committeeSlotId, requestedByUserId, cancellationToken);

        if (access.Status != GradeOperationStatus.Success)
        {
            return new StudentAssessmentResult(access.Status, null);
        }

        var assessment = await grades.GetStudentAssessmentAsync(sessionId, committeeSlotId, studentId, cancellationToken);

        return new StudentAssessmentResult(GradeOperationStatus.Success, assessment);
    }

    public async Task<CommitteeSlotAssessmentsResult> GetCommitteeSlotAssessmentsAsync(string sessionId, string committeeSlotId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return new CommitteeSlotAssessmentsResult(GradeOperationStatus.NotFound, []);
        }

        if (session.Status == SessionStatus.Closed)
        {
            return new CommitteeSlotAssessmentsResult(GradeOperationStatus.SessionClosed, []);
        }

        var access = await GetCommitteeAccessAsync(sessionId, committeeSlotId, requestedByUserId, cancellationToken);

        if (access.Status != GradeOperationStatus.Success)
        {
            return new CommitteeSlotAssessmentsResult(access.Status, []);
        }

        var assessments = await grades.GetCommitteeSlotAssessmentsAsync(sessionId, committeeSlotId, cancellationToken);

        return new CommitteeSlotAssessmentsResult(GradeOperationStatus.Success, assessments);
    }

    public async Task<StudentAssessmentResult> SaveStudentAssessmentAsync(SaveStudentAssessmentCommand command, CancellationToken cancellationToken = default)
    {
        var session = await sessions.GetSessionAsync(command.SessionId, cancellationToken);

        if (session is null)
        {
            return new StudentAssessmentResult(GradeOperationStatus.NotFound, null);
        }

        if (session.Status == SessionStatus.Closed)
        {
            return new StudentAssessmentResult(GradeOperationStatus.SessionClosed, null);
        }

        var access = await GetCommitteeAccessAsync(command.SessionId, command.CommitteeSlotId, command.RequestedByUserId, cancellationToken);

        if (access.Status != GradeOperationStatus.Success)
        {
            return new StudentAssessmentResult(access.Status, null);
        }

        var students = await sessions.GetStudentsAsync(command.SessionId, cancellationToken);

        if (students.All(student => student.Id != command.StudentId))
        {
            return new StudentAssessmentResult(GradeOperationStatus.StudentNotFound, null);
        }

        var criteria = await sessions.GetCriteriaAsync(command.SessionId, cancellationToken);
        var validationStatus = ValidateAssessment(command, session, criteria);

        if (validationStatus != GradeOperationStatus.Success)
        {
            return new StudentAssessmentResult(validationStatus, null);
        }

        var existingAssessment = await grades.GetStudentAssessmentAsync(command.SessionId, command.CommitteeSlotId, command.StudentId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var assessment = new StudentAssessment
        {
            SessionId = command.SessionId,
            StudentId = command.StudentId,
            CommitteeSlotId = command.CommitteeSlotId,
            Presence = command.Presence,
            Criteria = command.Presence == StudentAssessmentPresence.NotPresent
                ? []
                : command.Criteria.Select(criterion => new CriterionAssessment { CriterionId = criterion.CriterionId, Score = criterion.Score }).ToArray(),
            FinalGrade = command.Presence == StudentAssessmentPresence.NotPresent ? null : command.FinalGrade,
            CreatedAt = existingAssessment?.CreatedAt ?? now,
            UpdatedAt = now
        };

        await grades.SaveStudentAssessmentAsync(assessment, cancellationToken);

        return new StudentAssessmentResult(GradeOperationStatus.Success, assessment);
    }

    private async Task<CommitteeAccessResult> GetCommitteeAccessAsync(string sessionId, string committeeSlotId, string requestedByUserId, CancellationToken cancellationToken)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return new CommitteeAccessResult(GradeOperationStatus.NotFound);
        }

        var slot = await sessions.GetCommitteeSlotAsync(sessionId, committeeSlotId, cancellationToken);

        if (slot is null)
        {
            return new CommitteeAccessResult(GradeOperationStatus.CommitteeSlotNotFound);
        }

        if (slot.Role != SessionParticipantRole.CommitteeMember)
        {
            return new CommitteeAccessResult(GradeOperationStatus.Forbidden);
        }

        if (slot.ClaimedByUserId != requestedByUserId)
        {
            return new CommitteeAccessResult(GradeOperationStatus.Forbidden);
        }

        var participant = await sessions.GetParticipantBySlotAsync(sessionId, committeeSlotId, cancellationToken);

        if (participant is null || participant.UserId != requestedByUserId || participant.Role != SessionParticipantRole.CommitteeMember)
        {
            return new CommitteeAccessResult(GradeOperationStatus.Forbidden);
        }

        return new CommitteeAccessResult(GradeOperationStatus.Success);
    }

    private static GradeOperationStatus ValidateAssessment(SaveStudentAssessmentCommand command, GradingSession session, IReadOnlyList<Criterion> criteria)
    {
        if (command.Presence == StudentAssessmentPresence.NotPresent)
        {
            return GradeOperationStatus.Success;
        }

        var knownCriteria = criteria.ToDictionary(criterion => criterion.Id);
        var seenCriterionIds = new HashSet<string>();

        foreach (var criterionAssessment in command.Criteria)
        {
            if (!knownCriteria.TryGetValue(criterionAssessment.CriterionId, out var criterion))
            {
                return GradeOperationStatus.UnknownCriterion;
            }

            if (!seenCriterionIds.Add(criterionAssessment.CriterionId))
            {
                return GradeOperationStatus.DuplicateCriterion;
            }

            if (criterionAssessment.Score is not null && (criterionAssessment.Score < criterion.MinScore || criterionAssessment.Score > criterion.MaxScore))
            {
                return GradeOperationStatus.CriterionScoreOutOfRange;
            }
        }

        if (command.FinalGrade is not null && (command.FinalGrade < session.Settings.FinalGradeMinScore || command.FinalGrade > session.Settings.FinalGradeMaxScore))
        {
            return GradeOperationStatus.FinalGradeOutOfRange;
        }

        return GradeOperationStatus.Success;
    }

    private sealed record CommitteeAccessResult(
        GradeOperationStatus Status);
}