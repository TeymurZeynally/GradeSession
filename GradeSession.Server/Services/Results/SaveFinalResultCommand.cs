namespace GradeSession.Server.Services.Results;

public sealed record SaveFinalResultsCommand(
    string SessionId,
    string RequestedByUserId,
    IReadOnlyList<SaveFinalStudentResultCommand> Results);

public sealed record SaveFinalStudentResultCommand(
    string StudentId,
    double? FinalGrade);