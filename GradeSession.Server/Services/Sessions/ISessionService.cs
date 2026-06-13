using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Services.Sessions;

public interface ISessionService
{
    Task<CreateSessionResult> CreateAsync(CreateSessionCommand command, CancellationToken cancellationToken = default);

    Task<SessionOperationStatus> CheckReadAccessAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default);

    Task<GradingSession?> GetByIdAsync(string sessionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Student>> GetStudentsAsync(string sessionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Criterion>> GetCriteriaAsync(string sessionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CommitteeSlot>> GetCommitteeSlotsAsync(string sessionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SessionParticipant>> GetParticipantsAsync(string sessionId, CancellationToken cancellationToken = default);

    Task<SessionProgressResult> GetProgressAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default);

    Task<SessionOperationStatus> CloseAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default);
}