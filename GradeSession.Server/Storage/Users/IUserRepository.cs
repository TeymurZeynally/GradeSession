using GradeSession.Server.Domain.Users;

namespace GradeSession.Server.Storage.Users;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string userId, CancellationToken cancellationToken = default);

    Task SaveAsync(User user, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetSessionIdsAsync(string userId, CancellationToken cancellationToken = default);

    Task SaveSessionIdsAsync(string userId, IReadOnlyList<string> sessionIds, CancellationToken cancellationToken = default);
}