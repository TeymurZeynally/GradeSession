using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Services.Invites;

public sealed record IssuedInvite(
    string InviteId,
    string SessionId,
    string CommitteeSlotId,
    SessionParticipantRole Role,
    string FullName,
    string ShortName,
    string Token);