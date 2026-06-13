namespace GradeSession.Server.Domain.Results;

public sealed class FinalStudentResult
{
    public required string SessionId { get; init; }

    public required string StudentId { get; init; }

    public double? FinalGrade { get; set; }

    public required string UpdatedByUserId { get; set; }

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset UpdatedAt { get; set; }
}