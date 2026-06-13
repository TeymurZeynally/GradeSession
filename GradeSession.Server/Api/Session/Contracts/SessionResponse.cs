using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record SessionResponse(
    string Id,
    string Title,
    string CreatedByUserId,
    SessionStatus Status,
    SessionSettingsResponse Settings,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<StudentResponse> Students,
    IReadOnlyList<CriterionResponse> Criteria,
    IReadOnlyList<CommitteeSlotResponse> Committee);