namespace GradeSession.Server.Domain.Sessions;

public sealed class SessionParticipant
{
    public required string SessionId { get; init; }

    public required string CommitteeSlotId { get; init; }

    public required string UserId { get; init; }

    public required SessionParticipantRole Role { get; init; }

    public DateTimeOffset JoinedAt { get; init; }
}