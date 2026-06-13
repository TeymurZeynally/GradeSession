namespace GradeSession.Server.Security.RateLimiting.Options;

public sealed class AnonymousAuthQuotaOptions
{
    public int PermitLimitPerMinute { get; init; } = 5;

    public int PermitLimitPerHour { get; init; } = 30;

    public int QueueLimit { get; init; } = 0;
}