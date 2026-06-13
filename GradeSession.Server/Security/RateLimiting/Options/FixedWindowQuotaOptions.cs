namespace GradeSession.Server.Security.RateLimiting.Options;

public sealed class FixedWindowQuotaOptions
{
    public int PermitLimit { get; init; } = 600;

    public int WindowSeconds { get; init; } = 60;

    public int QueueLimit { get; init; } = 0;
}
