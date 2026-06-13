using GradeSession.Server.Security.Jwt.Services;
using GradeSession.Server.Services.Users;

namespace GradeSession.Server.Services.Auth;

public sealed class AuthService(IUserService users, IJwtTokenService jwtTokens) : IAuthService
{
    public async Task<AuthResult> CreateAnonymousAsync(CancellationToken cancellationToken = default)
    {
        var user = await users.CreateAnonymousUserAsync(cancellationToken);
        var token = jwtTokens.CreateToken(user.Id);

        return new AuthResult(user, token.AccessToken, token.ExpiresAt);
    }

    public async Task<AuthResult?> RenewAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return null;
        }

        await users.TouchAsync(userId, cancellationToken);

        var token = jwtTokens.CreateToken(user.Id);

        return new AuthResult(user, token.AccessToken, token.ExpiresAt);
    }
}