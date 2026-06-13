using GradeSession.Server.Domain.Users;

namespace GradeSession.Server.Services.Users;

public interface IUserService
{
    Task<User> CreateAnonymousUserAsync(CancellationToken cancellationToken = default);

    Task<User?> GetByIdAsync(string userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetSessionIdsAsync(string userId, CancellationToken cancellationToken = default);

    Task TouchAsync(string userId, CancellationToken cancellationToken = default);
}