namespace GradeSession.Server.Domain.Sessions;

public sealed class Student
{
    public required string Id { get; init; }

    public required string FullName { get; init; }

    public required string ShortName { get; init; }

    public required string Topic { get; init; }

    public string? Comment { get; init; }
}