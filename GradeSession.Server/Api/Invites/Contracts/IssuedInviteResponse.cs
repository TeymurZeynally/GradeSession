using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Api.Invites.Contracts;

public sealed record IssuedInviteResponse(
    string InviteId,
    string SessionId,
    string CommitteeSlotId,
    SessionParticipantRole Role,
    string FullName,
    string ShortName,
    string Token);