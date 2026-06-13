using GradeSession.Server.Domain.Users;
using GradeSession.Server.Storage.Users;

namespace GradeSession.Server.Services.Users;

public sealed class UserService(IUserRepository users) : IUserService
{
    public async Task<User> CreateAnonymousUserAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;

        var user = new User
        {
            Id = CreateUserId(),
            CreatedAt = now,
            LastSeenAt = now
        };

        await users.SaveAsync(user, cancellationToken);
        await users.SaveSessionIdsAsync(user.Id, [], cancellationToken);

        return user;
    }

    public Task<User?> GetByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return users.GetByIdAsync(userId, cancellationToken);
    }

    public Task<IReadOnlyList<string>> GetSessionIdsAsync(string userId, CancellationToken cancellationToken = default)
    {
        return users.GetSessionIdsAsync(userId, cancellationToken);
    }

    public async Task TouchAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return;
        }

        user.LastSeenAt = DateTimeOffset.UtcNow;

        await users.SaveAsync(user, cancellationToken);
    }

    private static string CreateUserId()
    {
        return $"usr_{Guid.NewGuid():N}";
    }
}