namespace GradeSession.Server.Services.Invites;

public interface IInviteService
{
    Task<IssueSessionInvitesResult> IssueSessionInvitesAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default);

    Task<GetSessionInvitesResult> GetSessionInvitesAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default);

    Task<ClaimInviteResult> ClaimAsync(string token, string userId, CancellationToken cancellationToken = default);
}