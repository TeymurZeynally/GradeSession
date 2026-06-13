namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record SessionSettingsResponse(
    int FinalGradeMinScore,
    int FinalGradeMaxScore);