namespace GradeSession.Server.Security.Jwt.Options;

public sealed class JwtOptions
{
    public required string Issuer { get; init; }

    public required string Audience { get; init; }

    public required string SecretKey { get; init; }

    public int ExpirationDays { get; init; } = 90;
}