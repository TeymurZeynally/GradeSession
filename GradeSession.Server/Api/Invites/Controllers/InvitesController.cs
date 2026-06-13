using GradeSession.Server.Api.Invites.Contracts;
using GradeSession.Server.Services.Invites;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Invites.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/invites")]
public sealed class InvitesController(IInviteService invites) : ControllerBase
{
    [HttpPost("{token}/claim")]
    public async Task<ActionResult<ClaimInviteResponse>> Claim(string token, CancellationToken cancellationToken)
    {
        var result = await invites.ClaimAsync(token, User.Identity!.Name!, cancellationToken);

        return result.Status switch
        {
            InviteClaimStatus.Claimed => Ok(new ClaimInviteResponse(result.Invite!.SessionId, result.Invite.CommitteeSlotId, result.Invite.Role)),
            InviteClaimStatus.AlreadyClaimedByCurrentUser => Ok(new ClaimInviteResponse(result.Invite!.SessionId, result.Invite.CommitteeSlotId, result.Invite.Role)),
            InviteClaimStatus.AlreadyClaimedByAnotherUser => Conflict(),
            InviteClaimStatus.NotFound => NotFound(),
            InviteClaimStatus.Revoked => StatusCode(StatusCodes.Status410Gone),
            InviteClaimStatus.SessionNotFound => NotFound(),
            InviteClaimStatus.CommitteeSlotNotFound => NotFound(),
            _ => Problem()
        };
    }
}