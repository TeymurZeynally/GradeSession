using GradeSession.Server.Domain.Grades;
using GradeSession.Server.Domain.Sessions;
using GradeSession.Server.Storage.Grades;
using GradeSession.Server.Storage.Sessions;
using GradeSession.Server.Storage.Users;

namespace GradeSession.Server.Services.Sessions;

public sealed class SessionService(ISessionRepository sessions, IUserRepository users, IGradeRepository grades) : ISessionService
{
    public async Task<CreateSessionResult> CreateAsync(CreateSessionCommand command, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var sessionId = CreateSessionId();

        var session = new GradingSession
        {
            Id = sessionId,
            Title = command.Title,
            CreatedByUserId = command.CreatedByUserId,
            Status = SessionStatus.Active,
            Settings = new SessionSettings
            {
                FinalGradeMinScore = command.Settings?.FinalGradeMinScore ?? 2,
                FinalGradeMaxScore = command.Settings?.FinalGradeMaxScore ?? 5
            },
            CreatedAt = now,
            UpdatedAt = now
        };

        var students = command.Students.Select(student => new Student
        {
            Id = CreateStudentId(),
            FullName = student.FullName,
            ShortName = student.ShortName,
            Topic = student.Topic,
            Comment = student.Comment
        }).ToArray();

        var criteria = command.Criteria.Select(criterion => new Criterion
        {
            Id = CreateCriterionId(),
            Title = criterion.Title,
            Description = criterion.Description,
            MinScore = criterion.MinScore ?? 2,
            MaxScore = criterion.MaxScore ?? 5,
            Weight = criterion.Weight ?? 1
        }).ToArray();

        var committeeSlots = command.Committee.Select(member => new CommitteeSlot
        {
            Id = CreateCommitteeSlotId(),
            Role = member.Role,
            FullName = member.FullName,
            ShortName = member.ShortName
        }).ToArray();

        await sessions.SaveSessionAsync(session, cancellationToken);
        await sessions.SaveStudentsAsync(session.Id, students, cancellationToken);
        await sessions.SaveCriteriaAsync(session.Id, criteria, cancellationToken);
        await sessions.SaveCommitteeSlotsAsync(session.Id, committeeSlots, cancellationToken);

        var userSessionIds = await users.GetSessionIdsAsync(command.CreatedByUserId, cancellationToken);

        if (!userSessionIds.Contains(sessionId))
        {
            await users.SaveSessionIdsAsync(command.CreatedByUserId, userSessionIds.Append(sessionId).ToArray(), cancellationToken);
        }

        return new CreateSessionResult(session, students, criteria, committeeSlots);
    }

    public async Task<SessionOperationStatus> CheckReadAccessAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return SessionOperationStatus.NotFound;
        }

        if (session.CreatedByUserId == requestedByUserId)
        {
            return SessionOperationStatus.Success;
        }

        var participants = await sessions.GetParticipantsByUserAsync(sessionId, requestedByUserId, cancellationToken);

        if (participants.Count == 0)
        {
            return SessionOperationStatus.Forbidden;
        }

        return SessionOperationStatus.Success;
    }

    public Task<GradingSession?> GetByIdAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        return sessions.GetSessionAsync(sessionId, cancellationToken);
    }

    public Task<IReadOnlyList<Student>> GetStudentsAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        return sessions.GetStudentsAsync(sessionId, cancellationToken);
    }

    public Task<IReadOnlyList<Criterion>> GetCriteriaAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        return sessions.GetCriteriaAsync(sessionId, cancellationToken);
    }

    public Task<IReadOnlyList<CommitteeSlot>> GetCommitteeSlotsAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        return sessions.GetCommitteeSlotsAsync(sessionId, cancellationToken);
    }

    public Task<IReadOnlyList<SessionParticipant>> GetParticipantsAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        return sessions.GetParticipantsAsync(sessionId, cancellationToken);
    }

    public async Task<SessionProgressResult> GetProgressAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var accessStatus = await CheckSecretaryAccessAsync(sessionId, requestedByUserId, cancellationToken);

        if (accessStatus != SessionOperationStatus.Success)
        {
            return new SessionProgressResult(accessStatus, null, 0, 0, []);
        }

        var students = await sessions.GetStudentsAsync(sessionId, cancellationToken);
        var criteria = await sessions.GetCriteriaAsync(sessionId, cancellationToken);
        var slots = await sessions.GetCommitteeSlotsAsync(sessionId, cancellationToken);
        var committeeMemberSlots = slots.Where(slot => slot.Role == SessionParticipantRole.CommitteeMember).ToArray();
        var progress = new List<CommitteeSlotProgress>();

        foreach (var slot in committeeMemberSlots)
        {
            var assessments = await grades.GetCommitteeSlotAssessmentsAsync(sessionId, slot.Id, cancellationToken);

            progress.Add(new CommitteeSlotProgress(
                slot.Id,
                slot.ClaimedByUserId,
                students.Count,
                assessments.Count,
                assessments.Count(assessment => IsCompleted(assessment, criteria)),
                students.Count * criteria.Count,
                assessments.Sum(assessment => assessment.Criteria.Count(criterion => criterion.Score is not null)),
                students.Count,
                assessments.Count(assessment => assessment.FinalGrade is not null)));
        }

        return new SessionProgressResult(SessionOperationStatus.Success, sessionId, students.Count, criteria.Count, progress);
    }

    public async Task<SessionOperationStatus> CloseAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var accessStatus = await CheckSecretaryAccessAsync(sessionId, requestedByUserId, cancellationToken);

        if (accessStatus != SessionOperationStatus.Success)
        {
            return accessStatus;
        }

        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return SessionOperationStatus.NotFound;
        }

        session.Status = SessionStatus.Closed;
        session.UpdatedAt = DateTimeOffset.UtcNow;

        await sessions.SaveSessionAsync(session, cancellationToken);

        return SessionOperationStatus.Success;
    }

    private async Task<SessionOperationStatus> CheckSecretaryAccessAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return SessionOperationStatus.NotFound;
        }

        var participants = await sessions.GetParticipantsByUserAsync(sessionId, requestedByUserId, cancellationToken);

        if (participants.Any(participant => participant.Role == SessionParticipantRole.Secretary))
        {
            return SessionOperationStatus.Success;
        }

        return SessionOperationStatus.Forbidden;
    }

    private static bool IsCompleted(StudentAssessment assessment, IReadOnlyList<Criterion> criteria)
    {
        if (assessment.Presence == StudentAssessmentPresence.NotPresent)
        {
            return true;
        }

        if (assessment.Presence != StudentAssessmentPresence.Present)
        {
            return false;
        }

        var scoresByCriterionId = assessment.Criteria.ToDictionary(criterion => criterion.CriterionId);

        return criteria.All(criterion => scoresByCriterionId.TryGetValue(criterion.Id, out var score) && score.Score is not null)
            && assessment.FinalGrade is not null;
    }

    private static string CreateSessionId()
    {
        return $"ses{Guid.NewGuid():N}";
    }

    private static string CreateStudentId()
    {
        return $"stu{Guid.NewGuid():N}";
    }

    private static string CreateCriterionId()
    {
        return $"crt{Guid.NewGuid():N}";
    }

    private static string CreateCommitteeSlotId()
    {
        return $"csl{Guid.NewGuid():N}";
    }
}