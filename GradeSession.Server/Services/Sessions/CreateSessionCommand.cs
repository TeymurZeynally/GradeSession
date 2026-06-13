using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Services.Sessions;

public sealed record CreateSessionCommand(
    string CreatedByUserId,
    string Title,
    CreateSessionSettingsCommand? Settings,
    IReadOnlyList<CreateStudentCommand> Students,
    IReadOnlyList<CreateCriterionCommand> Criteria,
    IReadOnlyList<CreateCommitteeSlotCommand> Committee);

public sealed record CreateSessionSettingsCommand(
    int? FinalGradeMinScore,
    int? FinalGradeMaxScore);

public sealed record CreateStudentCommand(
    string FullName,
    string ShortName,
    string Topic,
    string? Comment);

public sealed record CreateCriterionCommand(
    string Title,
    string? Description,
    int? MinScore,
    int? MaxScore,
    decimal? Weight);

public sealed record CreateCommitteeSlotCommand(
    SessionParticipantRole Role,
    string FullName,
    string ShortName);