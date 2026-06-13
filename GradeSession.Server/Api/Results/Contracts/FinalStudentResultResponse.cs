namespace GradeSession.Server.Api.Results.Contracts;

public sealed record FinalStudentResultResponse(
    string StudentId,
    double? FinalGrade,
    string UpdatedByUserId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);