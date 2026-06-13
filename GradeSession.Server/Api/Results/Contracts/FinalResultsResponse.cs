namespace GradeSession.Server.Api.Results.Contracts;

public sealed record FinalResultsResponse(
    IReadOnlyList<FinalStudentResultResponse> Results);