using System.Globalization;
using System.Threading.RateLimiting;
using GradeSession.Server.Security.RateLimiting.Models;
using GradeSession.Server.Security.RateLimiting.Options;
using Microsoft.AspNetCore.RateLimiting;

namespace GradeSession.Server.Security.RateLimiting;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddGradeSessionRateLimiting(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var section = configuration.GetSection(GradeSessionRateLimitingOptions.SectionName);

        var rateLimitOptions = section.Get<GradeSessionRateLimitingOptions>()
            ?? new GradeSessionRateLimitingOptions();

        services.Configure<GradeSessionRateLimitingOptions>(section);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            if (!rateLimitOptions.Enabled)
            {
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
                    _ => RateLimitPartition.GetNoLimiter("global-disabled"));

                options.AddPolicy(
                    RateLimitPolicyNames.AnonymousAuth,
                    _ => RateLimitPartition.GetNoLimiter("anonymous-auth-disabled"));

                return;
            }

            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers["Retry-After"] =
                        Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
                }

                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;

                await context.HttpContext.Response.WriteAsJsonAsync(
                    new
                    {
                        error = "rate_limited",
                        message = "Too many requests. Please retry later."
                    },
                    cancellationToken);
            };

            options.GlobalLimiter = PartitionedRateLimiter.CreateChained<HttpContext>(
                CreatePerIpLimiter(rateLimitOptions.PerIp),
                CreatePerUserLimiter(rateLimitOptions.PerUser));

            options.AddPolicy(
                RateLimitPolicyNames.AnonymousAuth,
                context => CreateAnonymousAuthPartition(context, rateLimitOptions.AnonymousAuth));
        });

        return services;
    }

    private static PartitionedRateLimiter<HttpContext> CreatePerIpLimiter(FixedWindowQuotaOptions quota)
    {
        return PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            if (!IsApiRequest(context))
            {
                return RateLimitPartition.GetNoLimiter("non-api");
            }

            var partitionKey = $"api:ip:{GetClientIp(context)}";

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey,
                _ => CreateFixedWindowOptions(
                    quota.PermitLimit,
                    TimeSpan.FromSeconds(quota.WindowSeconds),
                    quota.QueueLimit));
        });
    }

    private static PartitionedRateLimiter<HttpContext> CreatePerUserLimiter(FixedWindowQuotaOptions quota)
    {
        return PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            if (!IsApiRequest(context))
            {
                return RateLimitPartition.GetNoLimiter("non-api");
            }

            var identity = context.User.Identity;

            if (identity?.IsAuthenticated != true || string.IsNullOrWhiteSpace(identity.Name))
            {
                return RateLimitPartition.GetNoLimiter("anonymous-user-noop");
            }

            var partitionKey = $"api:user:{identity.Name}";

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey,
                _ => CreateFixedWindowOptions(
                    quota.PermitLimit,
                    TimeSpan.FromSeconds(quota.WindowSeconds),
                    quota.QueueLimit));
        });
    }

    private static RateLimitPartition<string> CreateAnonymousAuthPartition(
        HttpContext context,
        AnonymousAuthQuotaOptions quota)
    {
        var partitionKey = $"anonymous-auth:ip:{GetClientIp(context)}";

        return RateLimitPartition.Get(
            partitionKey,
            _ => RateLimiter.CreateChained(
                new FixedWindowRateLimiter(CreateFixedWindowOptions(
                    quota.PermitLimitPerMinute,
                    TimeSpan.FromMinutes(1),
                    quota.QueueLimit)),
                new FixedWindowRateLimiter(CreateFixedWindowOptions(
                    quota.PermitLimitPerHour,
                    TimeSpan.FromHours(1),
                    quota.QueueLimit))));
    }

    private static FixedWindowRateLimiterOptions CreateFixedWindowOptions(
        int permitLimit,
        TimeSpan window,
        int queueLimit)
    {
        return new FixedWindowRateLimiterOptions
        {
            PermitLimit = Math.Max(1, permitLimit),
            Window = window <= TimeSpan.Zero ? TimeSpan.FromSeconds(1) : window,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = Math.Max(0, queueLimit),
            AutoReplenishment = true
        };
    }

    private static bool IsApiRequest(HttpContext context)
    {
        return context.Request.Path.StartsWithSegments("/api");
    }

    private static string GetClientIp(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress;

        if (ip is null)
        {
            return "unknown";
        }

        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        return ip.ToString();
    }
}