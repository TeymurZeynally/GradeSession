using System.Security.Cryptography;
using System.Text;
using GradeSession.Server.Domain.Invites;
using GradeSession.Server.Domain.Sessions;
using GradeSession.Server.Storage.Invites;
using GradeSession.Server.Storage.Sessions;
using GradeSession.Server.Storage.Users;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace GradeSession.Server.Services.Invites;

public sealed class InviteService(IInviteRepository invites, ISessionRepository sessions, IUserRepository users, IOptions<InviteOptions> options) : IInviteService
{
    public async Task<IssueSessionInvitesResult> IssueSessionInvitesAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var accessStatus = await CheckInviteOwnerAccessAsync(sessionId, requestedByUserId, cancellationToken);

        if (accessStatus != InviteOperationStatus.Success)
        {
            return new IssueSessionInvitesResult(accessStatus, []);
        }

        var now = DateTimeOffset.UtcNow;
        var slots = await sessions.GetCommitteeSlotsAsync(sessionId, cancellationToken);
        var existingInvites = await invites.GetBySessionIdAsync(sessionId, cancellationToken);

        foreach (var existingInvite in existingInvites.Where(invite => invite.RevokedAt is null))
        {
            existingInvite.RevokedAt = now;
            await invites.SaveAsync(existingInvite, cancellationToken);
        }

        var issuedInvites = new List<IssuedInvite>();

        foreach (var slot in slots)
        {
            var token = CreateToken();
            var invite = new Invite
            {
                Id = CreateInviteId(),
                SessionId = sessionId,
                CommitteeSlotId = slot.Id,
                Role = slot.Role,
                TokenHash = HashToken(token),
                CreatedAt = now
            };

            await invites.SaveAsync(invite, cancellationToken);

            issuedInvites.Add(new IssuedInvite(invite.Id, invite.SessionId, invite.CommitteeSlotId, invite.Role, slot.FullName, slot.ShortName, token));
        }

        return new IssueSessionInvitesResult(InviteOperationStatus.Success, issuedInvites);
    }

    public async Task<GetSessionInvitesResult> GetSessionInvitesAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default)
    {
        var accessStatus = await CheckInviteOwnerAccessAsync(sessionId, requestedByUserId, cancellationToken);

        if (accessStatus != InviteOperationStatus.Success)
        {
            return new GetSessionInvitesResult(accessStatus, []);
        }

        var sessionInvites = await invites.GetBySessionIdAsync(sessionId, cancellationToken);

        return new GetSessionInvitesResult(InviteOperationStatus.Success, sessionInvites);
    }

    public async Task<ClaimInviteResult> ClaimAsync(string token, string userId, CancellationToken cancellationToken = default)
    {
        var invite = await invites.GetByTokenAsync(token, cancellationToken);

        if (invite is null)
        {
            return new ClaimInviteResult(InviteClaimStatus.NotFound, null, null);
        }

        if (invite.RevokedAt is not null)
        {
            return new ClaimInviteResult(InviteClaimStatus.Revoked, invite, null);
        }

        var session = await sessions.GetSessionAsync(invite.SessionId, cancellationToken);

        if (session is null)
        {
            return new ClaimInviteResult(InviteClaimStatus.SessionNotFound, invite, null);
        }

        var slot = await sessions.GetCommitteeSlotAsync(invite.SessionId, invite.CommitteeSlotId, cancellationToken);

        if (slot is null)
        {
            return new ClaimInviteResult(InviteClaimStatus.CommitteeSlotNotFound, invite, null);
        }

        if (slot.ClaimedByUserId == userId)
        {
            invite.ClaimedByUserId = userId;
            invite.ClaimedAt ??= DateTimeOffset.UtcNow;

            await invites.SaveAsync(invite, cancellationToken);
            await EnsureParticipantAsync(invite.SessionId, slot.Id, slot.Role, userId, cancellationToken);

            return new ClaimInviteResult(InviteClaimStatus.AlreadyClaimedByCurrentUser, invite, slot);
        }

        if (slot.ClaimedByUserId is not null && options.Value.ClaimMode == InviteClaimMode.Reject)
        {
            return new ClaimInviteResult(InviteClaimStatus.AlreadyClaimedByAnotherUser, invite, slot);
        }

        if (slot.ClaimedByUserId is not null && options.Value.ClaimMode == InviteClaimMode.Replace)
        {
            await RemovePreviousClaimAsync(invite.SessionId, slot.Id, slot.ClaimedByUserId, cancellationToken);
        }

        var now = DateTimeOffset.UtcNow;

        invite.ClaimedByUserId = userId;
        invite.ClaimedAt = now;

        slot.ClaimedByUserId = userId;
        slot.ClaimedAt = now;

        await invites.SaveAsync(invite, cancellationToken);
        await sessions.SaveCommitteeSlotAsync(invite.SessionId, slot, cancellationToken);
        await EnsureParticipantAsync(invite.SessionId, slot.Id, slot.Role, userId, cancellationToken);

        return new ClaimInviteResult(InviteClaimStatus.Claimed, invite, slot);
    }

    private async Task<InviteOperationStatus> CheckInviteOwnerAccessAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken)
    {
        var session = await sessions.GetSessionAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return InviteOperationStatus.NotFound;
        }

        if (session.CreatedByUserId != requestedByUserId)
        {
            return InviteOperationStatus.Forbidden;
        }

        return InviteOperationStatus.Success;
    }

    private async Task EnsureParticipantAsync(string sessionId, string committeeSlotId, SessionParticipantRole role, string userId, CancellationToken cancellationToken)
    {
        var participant = new SessionParticipant
        {
            SessionId = sessionId,
            CommitteeSlotId = committeeSlotId,
            UserId = userId,
            Role = role,
            JoinedAt = DateTimeOffset.UtcNow
        };

        await sessions.SaveParticipantAsync(participant, cancellationToken);

        var userSessionIds = await users.GetSessionIdsAsync(userId, cancellationToken);

        if (!userSessionIds.Contains(sessionId))
        {
            await users.SaveSessionIdsAsync(userId, userSessionIds.Append(sessionId).ToArray(), cancellationToken);
        }
    }

    private async Task RemovePreviousClaimAsync(string sessionId, string committeeSlotId, string previousUserId, CancellationToken cancellationToken)
    {
        await sessions.RemoveParticipantBySlotAsync(sessionId, committeeSlotId, cancellationToken);

        var previousUserParticipants = await sessions.GetParticipantsByUserAsync(sessionId, previousUserId, cancellationToken);

        if (previousUserParticipants.Count > 0)
        {
            return;
        }

        var previousUserSessionIds = await users.GetSessionIdsAsync(previousUserId, cancellationToken);
        var updatedSessionIds = previousUserSessionIds.Where(id => id != sessionId).ToArray();

        await users.SaveSessionIdsAsync(previousUserId, updatedSessionIds, cancellationToken);
    }

    private string CreateToken()
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(options.Value.TokenByteLength);

        return WebEncoders.Base64UrlEncode(tokenBytes);
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));

        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string CreateInviteId()
    {
        return $"inv_{Guid.NewGuid():N}";
    }
}