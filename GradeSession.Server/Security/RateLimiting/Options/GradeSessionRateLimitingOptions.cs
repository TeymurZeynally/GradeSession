namespace GradeSession.Server.Security.RateLimiting.Options;

public sealed class GradeSessionRateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    public bool Enabled { get; init; } = true;

    public FixedWindowQuotaOptions PerIp { get; init; } = new()
    {
        PermitLimit = 900,
        WindowSeconds = 60,
        QueueLimit = 30
    };

    public FixedWindowQuotaOptions PerUser { get; init; } = new()
    {
        PermitLimit = 600,
        WindowSeconds = 60,
        QueueLimit = 30
    };

    public AnonymousAuthQuotaOptions AnonymousAuth { get; init; } = new();
}