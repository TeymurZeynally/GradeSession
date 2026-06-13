using GradeSession.Server.Domain.Sessions;
using GradeSession.Server.Storage.Cache;

namespace GradeSession.Server.Storage.Sessions;

public sealed class SessionRepository(ICacheStore cache) : ISessionRepository
{
    public Task<GradingSession?> GetSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        return cache.GetAsync<GradingSession>(CacheKeyBuilder.Session(sessionId), cancellationToken);
    }

    public Task SaveSessionAsync(GradingSession session, CancellationToken cancellationToken = default)
    {
        return cache.SetAsync(CacheKeyBuilder.Session(session.Id), session, cancellationToken);
    }

    public async Task SaveStudentsAsync(string sessionId, IReadOnlyList<Student> students, CancellationToken cancellationToken = default)
    {
        await cache.SetAsync(CacheKeyBuilder.SessionStudentIds(sessionId), students.Select(student => student.Id).ToArray(), cancellationToken);

        foreach (var student in students)
        {
            await cache.SetAsync(CacheKeyBuilder.SessionStudent(sessionId, student.Id), student, cancellationToken);
        }
    }

    public async Task<IReadOnlyList<Student>> GetStudentsAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var studentIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionStudentIds(sessionId), cancellationToken) ?? [];
        var students = new List<Student>();

        foreach (var studentId in studentIds)
        {
            var student = await cache.GetAsync<Student>(CacheKeyBuilder.SessionStudent(sessionId, studentId), cancellationToken);

            if (student is not null)
            {
                students.Add(student);
            }
        }

        return students;
    }

    public async Task SaveCriteriaAsync(string sessionId, IReadOnlyList<Criterion> criteria, CancellationToken cancellationToken = default)
    {
        await cache.SetAsync(CacheKeyBuilder.SessionCriterionIds(sessionId), criteria.Select(criterion => criterion.Id).ToArray(), cancellationToken);

        foreach (var criterion in criteria)
        {
            await cache.SetAsync(CacheKeyBuilder.SessionCriterion(sessionId, criterion.Id), criterion, cancellationToken);
        }
    }

    public async Task<IReadOnlyList<Criterion>> GetCriteriaAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var criterionIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionCriterionIds(sessionId), cancellationToken) ?? [];
        var criteria = new List<Criterion>();

        foreach (var criterionId in criterionIds)
        {
            var criterion = await cache.GetAsync<Criterion>(CacheKeyBuilder.SessionCriterion(sessionId, criterionId), cancellationToken);

            if (criterion is not null)
            {
                criteria.Add(criterion);
            }
        }

        return criteria;
    }

    public async Task SaveCommitteeSlotsAsync(string sessionId, IReadOnlyList<CommitteeSlot> slots, CancellationToken cancellationToken = default)
    {
        await cache.SetAsync(CacheKeyBuilder.SessionCommitteeSlotIds(sessionId), slots.Select(slot => slot.Id).ToArray(), cancellationToken);

        foreach (var slot in slots)
        {
            await SaveCommitteeSlotAsync(sessionId, slot, cancellationToken);
        }
    }

    public async Task<IReadOnlyList<CommitteeSlot>> GetCommitteeSlotsAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var slotIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionCommitteeSlotIds(sessionId), cancellationToken) ?? [];
        var slots = new List<CommitteeSlot>();

        foreach (var slotId in slotIds)
        {
            var slot = await GetCommitteeSlotAsync(sessionId, slotId, cancellationToken);

            if (slot is not null)
            {
                slots.Add(slot);
            }
        }

        return slots;
    }

    public Task<CommitteeSlot?> GetCommitteeSlotAsync(string sessionId, string committeeSlotId, CancellationToken cancellationToken = default)
    {
        return cache.GetAsync<CommitteeSlot>(CacheKeyBuilder.SessionCommitteeSlot(sessionId, committeeSlotId), cancellationToken);
    }

    public Task SaveCommitteeSlotAsync(string sessionId, CommitteeSlot slot, CancellationToken cancellationToken = default)
    {
        return cache.SetAsync(CacheKeyBuilder.SessionCommitteeSlot(sessionId, slot.Id), slot, cancellationToken);
    }

    public async Task SaveParticipantAsync(SessionParticipant participant, CancellationToken cancellationToken = default)
    {
        var committeeSlotIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionParticipantCommitteeSlotIds(participant.SessionId), cancellationToken) ?? [];

        if (!committeeSlotIds.Contains(participant.CommitteeSlotId))
        {
            committeeSlotIds.Add(participant.CommitteeSlotId);
        }

        await cache.SetAsync(CacheKeyBuilder.SessionParticipantCommitteeSlotIds(participant.SessionId), committeeSlotIds, cancellationToken);
        await cache.SetAsync(CacheKeyBuilder.SessionParticipant(participant.SessionId, participant.CommitteeSlotId), participant, cancellationToken);
    }

    public Task<SessionParticipant?> GetParticipantBySlotAsync(string sessionId, string committeeSlotId, CancellationToken cancellationToken = default)
    {
        return cache.GetAsync<SessionParticipant>(CacheKeyBuilder.SessionParticipant(sessionId, committeeSlotId), cancellationToken);
    }

    public async Task<IReadOnlyList<SessionParticipant>> GetParticipantsAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var committeeSlotIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionParticipantCommitteeSlotIds(sessionId), cancellationToken) ?? [];
        var participants = new List<SessionParticipant>();

        foreach (var committeeSlotId in committeeSlotIds)
        {
            var participant = await GetParticipantBySlotAsync(sessionId, committeeSlotId, cancellationToken);

            if (participant is not null)
            {
                participants.Add(participant);
            }
        }

        return participants;
    }

    public async Task<IReadOnlyList<SessionParticipant>> GetParticipantsByUserAsync(string sessionId, string userId, CancellationToken cancellationToken = default)
    {
        var participants = await GetParticipantsAsync(sessionId, cancellationToken);

        return participants.Where(participant => participant.UserId == userId).ToArray();
    }

    public async Task RemoveParticipantBySlotAsync(string sessionId, string committeeSlotId, CancellationToken cancellationToken = default)
    {
        var committeeSlotIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionParticipantCommitteeSlotIds(sessionId), cancellationToken) ?? [];

        committeeSlotIds.Remove(committeeSlotId);

        await cache.SetAsync(CacheKeyBuilder.SessionParticipantCommitteeSlotIds(sessionId), committeeSlotIds, cancellationToken);
        await cache.RemoveAsync(CacheKeyBuilder.SessionParticipant(sessionId, committeeSlotId), cancellationToken);
    }
}