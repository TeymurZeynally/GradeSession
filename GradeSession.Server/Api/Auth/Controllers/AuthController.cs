using GradeSession.Server.Api.Auth.Contracts;
using GradeSession.Server.Security.RateLimiting.Models;
using GradeSession.Server.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GradeSession.Server.Api.Auth.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("anonymous")]
    [EnableRateLimiting(RateLimitPolicyNames.AnonymousAuth)]
    public async Task<ActionResult<AuthResponse>> Anonymous(CancellationToken cancellationToken)
    {
        var result = await authService.CreateAnonymousAsync(cancellationToken);

        return Ok(ToResponse(result));
    }

    [Authorize]
    [HttpPost("renew")]
    public async Task<ActionResult<AuthResponse>> Renew(CancellationToken cancellationToken)
    {
        var result = await authService.RenewAsync(User.Identity!.Name!, cancellationToken);

        if (result is null)
        {
            return Unauthorized();
        }

        return Ok(ToResponse(result));
    }

    private static AuthResponse ToResponse(AuthResult result)
    {
        return new AuthResponse(
            result.AccessToken,
            result.ExpiresAt,
            new AuthUserIdentityResponse(result.User.Id, result.User.CreatedAt, result.User.LastSeenAt));
    }
}