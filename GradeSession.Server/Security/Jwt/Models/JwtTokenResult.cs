namespace GradeSession.Server.Security.Jwt.Models;

public sealed record JwtTokenResult(string AccessToken, DateTimeOffset ExpiresAt);