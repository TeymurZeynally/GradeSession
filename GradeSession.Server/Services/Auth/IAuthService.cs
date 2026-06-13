namespace GradeSession.Server.Services.Auth;

public interface IAuthService
{
    Task<AuthResult> CreateAnonymousAsync(CancellationToken cancellationToken = default);

    Task<AuthResult?> RenewAsync(string userId, CancellationToken cancellationToken = default);
}