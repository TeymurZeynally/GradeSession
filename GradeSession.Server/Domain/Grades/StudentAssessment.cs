namespace GradeSession.Server.Domain.Grades;

public sealed class StudentAssessment
{
    public required string SessionId { get; init; }

    public required string StudentId { get; init; }

    public required string CommitteeSlotId { get; init; }

    public StudentAssessmentPresence Presence { get; set; } = StudentAssessmentPresence.Unknown;

    public IReadOnlyList<CriterionAssessment> Criteria { get; set; } = [];

    public double? FinalGrade { get; set; }

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset UpdatedAt { get; set; }
}