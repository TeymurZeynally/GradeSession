using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record CreateSessionResponse(
    string Id,
    string Title,
    SessionStatus Status,
    SessionSettingsResponse Settings,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<StudentResponse> Students,
    IReadOnlyList<CriterionResponse> Criteria,
    IReadOnlyList<CommitteeSlotResponse> Committee);