namespace GradeSession.Server.Services.Results;

public enum ResultOperationStatus
{
    Success = 0,
    NotFound = 1,
    Forbidden = 2,
    SessionNotClosed = 3,
    UnknownStudent = 4,
    FinalGradeOutOfRange = 5
}