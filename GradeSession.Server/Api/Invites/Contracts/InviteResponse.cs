using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Api.Invites.Contracts;

public sealed record InviteResponse(
    string Id,
    string SessionId,
    string CommitteeSlotId,
    SessionParticipantRole Role,
    DateTimeOffset CreatedAt,
    string? ClaimedByUserId,
    DateTimeOffset? ClaimedAt,
    DateTimeOffset? RevokedAt);