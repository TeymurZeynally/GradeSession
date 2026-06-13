namespace GradeSession.Server.Api.Auth.Contracts;

public sealed record AuthUserIdentityResponse(string Id, DateTimeOffset CreatedAt, DateTimeOffset LastSeenAt);