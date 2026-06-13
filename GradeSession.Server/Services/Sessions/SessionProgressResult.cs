namespace GradeSession.Server.Services.Sessions;

public sealed record SessionProgressResult(
    SessionOperationStatus Status,
    string? SessionId,
    int StudentsCount,
    int CriteriaCount,
    IReadOnlyList<CommitteeSlotProgress> Committee);