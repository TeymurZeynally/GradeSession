using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Api.Invites.Contracts;

public sealed record ClaimInviteResponse(
    string SessionId,
    string CommitteeSlotId,
    SessionParticipantRole Role);