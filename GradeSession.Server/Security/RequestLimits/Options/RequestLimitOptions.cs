namespace GradeSession.Server.Security.RequestLimits.Options;

public sealed class RequestLimitOptions
{
    public const string SectionName = "RequestLimits";

    public bool Enabled { get; init; } = true;

    public long MaxRequestBodySizeBytes { get; init; } = 1_048_576;

    public int RequestHeadersTimeoutSeconds { get; init; } = 15;
}