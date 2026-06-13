namespace GradeSession.Server.Domain.Users;

public sealed class User
{
    public required string Id { get; init; }

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset LastSeenAt { get; set; }
}