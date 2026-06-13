using GradeSession.Server.Domain.Results;
using GradeSession.Server.Storage.Cache;

namespace GradeSession.Server.Storage.Results;

public sealed class ResultRepository(ICacheStore cache) : IResultRepository
{
    public async Task<IReadOnlyList<FinalStudentResult>> GetFinalResultsAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var studentIds = await cache.GetAsync<List<string>>(CacheKeyBuilder.SessionFinalResultStudentIds(sessionId), cancellationToken) ?? [];
        var results = new List<FinalStudentResult>();

        foreach (var studentId in studentIds)
        {
            var result = await cache.GetAsync<FinalStudentResult>(CacheKeyBuilder.SessionFinalResult(sessionId, studentId), cancellationToken);

            if (result is not null)
            {
                results.Add(result);
            }
        }

        return results;
    }

    public async Task SaveFinalResultsAsync(string sessionId, IReadOnlyList<FinalStudentResult> results, CancellationToken cancellationToken = default)
    {
        await cache.SetAsync(CacheKeyBuilder.SessionFinalResultStudentIds(sessionId), results.Select(result => result.StudentId).ToArray(), cancellationToken);

        foreach (var result in results)
        {
            await cache.SetAsync(CacheKeyBuilder.SessionFinalResult(sessionId, result.StudentId), result, cancellationToken);
        }
    }
}