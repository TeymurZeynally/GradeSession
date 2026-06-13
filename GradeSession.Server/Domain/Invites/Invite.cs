using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Domain.Invites;

public sealed class Invite
{
    public required string Id { get; init; }

    public required string SessionId { get; init; }

    public required string CommitteeSlotId { get; init; }

    public required SessionParticipantRole Role { get; init; }

    public required string TokenHash { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }

    public string? ClaimedByUserId { get; set; }

    public DateTimeOffset? ClaimedAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }
}