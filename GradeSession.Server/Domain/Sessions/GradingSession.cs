namespace GradeSession.Server.Domain.Sessions;

public sealed class GradingSession
{
    public required string Id { get; init; }

    public required string Title { get; init; }

    public required string CreatedByUserId { get; init; }

    public SessionStatus Status { get; set; } = SessionStatus.Draft;

    public SessionSettings Settings { get; init; } = SessionSettings.Default;

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset UpdatedAt { get; set; }
}