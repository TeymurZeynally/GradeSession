namespace GradeSession.Server.Services.Results;

public interface IResultService
{
    Task<AssessmentSummaryResult> GetAssessmentSummaryAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default);

    Task<FinalResultsOperationResult> GetFinalResultsAsync(string sessionId, string requestedByUserId, CancellationToken cancellationToken = default);

    Task<FinalResultsOperationResult> SaveFinalResultsAsync(SaveFinalResultsCommand command, CancellationToken cancellationToken = default);
}