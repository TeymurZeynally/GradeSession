namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record StudentResponse(
    string Id,
    string FullName,
    string ShortName,
    string Topic,
    string? Comment);