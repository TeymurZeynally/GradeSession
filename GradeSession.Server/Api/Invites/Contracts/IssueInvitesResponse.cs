namespace GradeSession.Server.Api.Invites.Contracts;

public sealed record IssueInvitesResponse(
    IReadOnlyList<IssuedInviteResponse> Invites
);