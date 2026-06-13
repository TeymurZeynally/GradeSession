using GradeSession.Server.Domain.Invites;

namespace GradeSession.Server.Services.Invites;

public sealed record GetSessionInvitesResult(
    InviteOperationStatus Status,
    IReadOnlyList<Invite> Invites);