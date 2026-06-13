namespace GradeSession.Server.Api.Users.Contracts;

public sealed record CurrentUserResponse(string UserId, IReadOnlyList<string> SessionIds);