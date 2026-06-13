using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record SessionParticipantResponse(
    string CommitteeSlotId,
    string UserId,
    SessionParticipantRole Role,
    DateTimeOffset JoinedAt);