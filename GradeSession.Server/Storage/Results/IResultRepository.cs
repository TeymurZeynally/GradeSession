using GradeSession.Server.Domain.Results;

namespace GradeSession.Server.Storage.Results;

public interface IResultRepository
{
    Task<IReadOnlyList<FinalStudentResult>> GetFinalResultsAsync(string sessionId, CancellationToken cancellationToken = default);

    Task SaveFinalResultsAsync(string sessionId, IReadOnlyList<FinalStudentResult> results, CancellationToken cancellationToken = default);
}