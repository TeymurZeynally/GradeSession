using GradeSession.Server.Domain.Users;

namespace GradeSession.Server.Services.Auth;

public sealed record AuthResult(User User, string AccessToken, DateTimeOffset ExpiresAt);