namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record CriterionResponse(
    string Id,
    string Title,
    string? Description,
    int MinScore,
    int MaxScore,
    decimal Weight);