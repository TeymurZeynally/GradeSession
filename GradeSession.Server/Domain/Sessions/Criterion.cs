namespace GradeSession.Server.Domain.Sessions;

public sealed class Criterion
{
    public required string Id { get; init; }

    public required string Title { get; init; }

    public string? Description { get; init; }

    public int MinScore { get; init; };

    public int MaxScore { get; init; };

    public decimal Weight { get; init; } = 1;
}