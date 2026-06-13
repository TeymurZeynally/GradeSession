namespace GradeSession.Server.Services.Grades;

public enum GradeOperationStatus
{
    Success = 0,
    NotFound = 1,
    Forbidden = 2,
    StudentNotFound = 3,
    CommitteeSlotNotFound = 4,
    UnknownCriterion = 5,
    DuplicateCriterion = 6,
    CriterionScoreOutOfRange = 7,
    FinalGradeOutOfRange = 8,
    SessionClosed = 9
}