using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record CommitteeSlotResponse(
    string Id,
    SessionParticipantRole Role,
    string FullName,
    string ShortName,
    string? ClaimedByUserId,
    DateTimeOffset? ClaimedAt);