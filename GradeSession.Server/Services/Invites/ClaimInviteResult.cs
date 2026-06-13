using GradeSession.Server.Domain.Invites;
using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Services.Invites;

public sealed record ClaimInviteResult(
    InviteClaimStatus Status,
    Invite? Invite,
    CommitteeSlot? CommitteeSlot);