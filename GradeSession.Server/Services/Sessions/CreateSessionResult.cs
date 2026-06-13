using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Services.Sessions;

public sealed record CreateSessionResult(
    GradingSession Session,
    IReadOnlyList<Student> Students,
    IReadOnlyList<Criterion> Criteria,
    IReadOnlyList<CommitteeSlot> CommitteeSlots);