namespace GradeSession.Server.Services.Invites;

public sealed record IssueSessionInvitesResult(
    InviteOperationStatus Status,
    IReadOnlyList<IssuedInvite> Invites);