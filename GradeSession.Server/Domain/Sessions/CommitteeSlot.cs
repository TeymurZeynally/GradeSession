namespace GradeSession.Server.Domain.Sessions;

public sealed class CommitteeSlot
{
    public required string Id { get; init; }

    public required SessionParticipantRole Role { get; init; }

    public required string FullName { get; init; }

    public required string ShortName { get; init; }

    public string? ClaimedByUserId { get; set; }

    public DateTimeOffset? ClaimedAt { get; set; }
}