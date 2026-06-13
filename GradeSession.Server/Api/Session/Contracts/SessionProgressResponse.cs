namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record SessionProgressResponse(
    string SessionId,
    int StudentsCount,
    int CriteriaCount,
    IReadOnlyList<CommitteeSlotProgressResponse> Committee);