using System.Security.Cryptography;
using System.Text;
using GradeSession.Server.Domain.Invites;
using GradeSession.Server.Storage.Cache;

namespace GradeSession.Server.Storage.Invites;

public sealed class InviteRepository(ICacheStore cache) : IInviteRepository
{
    public Task<Invite?> GetByIdAsync(string inviteId, CancellationToken cancellationToken = default)
    {
        return cache.GetAsync<Invite>(CacheKeyBuilder.Invite(inviteId), cancellationToken);
    }

    public async Task<Invite?> GetByTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(token);
        var inviteId = await cache.GetAsync<string>(CacheKeyBuilder.InviteByTokenHash(tokenHash), cancellationToken);

        if (string.IsNullOrWhiteSpace(inviteId))
        {
            return null;
        }

        return await GetByIdAsync(inviteId, cancellationToken);
    }

    public async Task<IReadOnlyList<Invite>> GetBySessionIdAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var inviteIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionInviteIds(sessionId), cancellationToken) ?? [];
        var sessionInvites = new List<Invite>();

        foreach (var inviteId in inviteIds)
        {
            var invite = await GetByIdAsync(inviteId, cancellationToken);

            if (invite is not null)
            {
                sessionInvites.Add(invite);
            }
        }

        return sessionInvites;
    }

    public async Task SaveAsync(Invite invite, CancellationToken cancellationToken = default)
    {
        await cache.SetAsync(CacheKeyBuilder.Invite(invite.Id), invite, cancellationToken);
        await cache.SetAsync(CacheKeyBuilder.InviteByTokenHash(invite.TokenHash), invite.Id, cancellationToken);

        var inviteIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionInviteIds(invite.SessionId), cancellationToken) ?? [];

        if (!inviteIds.Contains(invite.Id))
        {
            inviteIds.Add(invite.Id);
        }

        await cache.SetAsync(CacheKeyBuilder.SessionInviteIds(invite.SessionId), inviteIds, cancellationToken);
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));

        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}