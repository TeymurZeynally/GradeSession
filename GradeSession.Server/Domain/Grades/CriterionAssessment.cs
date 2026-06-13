namespace GradeSession.Server.Domain.Grades;

public sealed class CriterionAssessment
{
    public required string CriterionId { get; init; }

    public double? Score { get; set; }
}