namespace GradeSession.Server.Api.Auth.Contracts;

public sealed record AuthResponse(string AccessToken, DateTimeOffset ExpiresAt, AuthUserIdentityResponse User);