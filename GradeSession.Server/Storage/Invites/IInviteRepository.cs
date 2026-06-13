using GradeSession.Server.Domain.Invites;

namespace GradeSession.Server.Storage.Invites;

public interface IInviteRepository
{
    Task<Invite?> GetByIdAsync(string inviteId, CancellationToken cancellationToken = default);

    Task<Invite?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Invite>> GetBySessionIdAsync(string sessionId, CancellationToken cancellationToken = default);

    Task SaveAsync(Invite invite, CancellationToken cancellationToken = default);
}