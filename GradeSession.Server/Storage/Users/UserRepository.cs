using GradeSession.Server.Domain.Users;
using GradeSession.Server.Storage.Cache;

namespace GradeSession.Server.Storage.Users;

public sealed class UserRepository(ICacheStore cache) : IUserRepository
{
    public Task<User?> GetByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return cache.GetAsync<User>(CacheKeyBuilder.User(userId), cancellationToken);
    }

    public Task SaveAsync(User user, CancellationToken cancellationToken = default)
    {
        return cache.SetAsync(CacheKeyBuilder.User(user.Id), user, cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetSessionIdsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var sessionIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.UserSessionIds(userId), cancellationToken);

        return sessionIds ?? [];
    }

    public Task SaveSessionIdsAsync(string userId, IReadOnlyList<string> sessionIds, CancellationToken cancellationToken = default)
    {
        return cache.SetAsync(CacheKeyBuilder.UserSessionIds(userId), sessionIds, cancellationToken);
    }
}