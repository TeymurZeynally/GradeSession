namespace GradeSession.Server.Domain.Sessions;

public sealed class SessionSettings
{
    public int FinalGradeMinScore { get; init; }

    public int FinalGradeMaxScore { get; init; }

    public static SessionSettings Default => new();
}