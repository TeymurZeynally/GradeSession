using GradeSession.Server.Api.Users.Contracts;
using GradeSession.Server.Services.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Users.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/user")]
public sealed class UserController(IUserService users) : ControllerBase
{
    [HttpGet("current")]
    public async Task<ActionResult<CurrentUserResponse>> GetCurrent(CancellationToken cancellationToken)
    {
        var userId = User.Identity!.Name!;

        var user = await users.GetByIdAsync(userId, cancellationToken);

        if (user is null)
        {
            return Unauthorized();
        }

        await users.TouchAsync(userId, cancellationToken);

        var sessionIds = await users.GetSessionIdsAsync(userId, cancellationToken);

        return Ok(new CurrentUserResponse(user.Id, sessionIds));
    }
}