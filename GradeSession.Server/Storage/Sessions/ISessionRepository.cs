using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Storage.Sessions;

public interface ISessionRepository
{
    Task<GradingSession?> GetSessionAsync(string sessionId, CancellationToken cancellationToken = default);

    Task SaveSessionAsync(GradingSession session, CancellationToken cancellationToken = default);

    Task SaveStudentsAsync(string sessionId, IReadOnlyList<Student> students, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Student>> GetStudentsAsync(string sessionId, CancellationToken cancellationToken = default);

    Task SaveCriteriaAsync(string sessionId, IReadOnlyList<Criterion> criteria, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Criterion>> GetCriteriaAsync(string sessionId, CancellationToken cancellationToken = default);

    Task SaveCommitteeSlotsAsync(string sessionId, IReadOnlyList<CommitteeSlot> slots, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CommitteeSlot>> GetCommitteeSlotsAsync(string sessionId, CancellationToken cancellationToken = default);

    Task<CommitteeSlot?> GetCommitteeSlotAsync(string sessionId, string committeeSlotId, CancellationToken cancellationToken = default);

    Task SaveCommitteeSlotAsync(string sessionId, CommitteeSlot slot, CancellationToken cancellationToken = default);

    Task SaveParticipantAsync(SessionParticipant participant, CancellationToken cancellationToken = default);

    Task<SessionParticipant?> GetParticipantBySlotAsync(string sessionId, string committeeSlotId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SessionParticipant>> GetParticipantsAsync(string sessionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SessionParticipant>> GetParticipantsByUserAsync(string sessionId, string userId, CancellationToken cancellationToken = default);

    Task RemoveParticipantBySlotAsync(string sessionId, string committeeSlotId, CancellationToken cancellationToken = default);
}