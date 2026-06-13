using GradeSession.Server.Domain.Results;

namespace GradeSession.Server.Services.Results;

public sealed record FinalResultsOperationResult(
    ResultOperationStatus Status,
    IReadOnlyList<FinalStudentResult> Results);