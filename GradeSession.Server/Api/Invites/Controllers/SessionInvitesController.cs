using GradeSession.Server.Api.Invites.Contracts;
using GradeSession.Server.Domain.Invites;
using GradeSession.Server.Services.Invites;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Invites.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sessions/{sessionId}/invites")]
public sealed class SessionInvitesController(IInviteService invites) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InviteResponse>>> GetAll(string sessionId, CancellationToken cancellationToken)
    {
        var result = await invites.GetSessionInvitesAsync(sessionId, User.Identity!.Name!, cancellationToken);

        return result.Status switch
        {
            InviteOperationStatus.Success => Ok(result.Invites.Select(ToResponse).ToArray()),
            InviteOperationStatus.NotFound => NotFound(),
            InviteOperationStatus.Forbidden => Forbid(),
            _ => Problem()
        };
    }

    [HttpPost("issue")]
    public async Task<ActionResult<IssueInvitesResponse>> Issue(string sessionId, CancellationToken cancellationToken)
    {
        var result = await invites.IssueSessionInvitesAsync(sessionId, User.Identity!.Name!, cancellationToken);

        return result.Status switch
        {
            InviteOperationStatus.Success => Ok(new IssueInvitesResponse(result.Invites.Select(ToResponse).ToArray())),
            InviteOperationStatus.NotFound => NotFound(),
            InviteOperationStatus.Forbidden => Forbid(),
            _ => Problem()
        };
    }

    private static InviteResponse ToResponse(Invite invite)
    {
        return new InviteResponse(invite.Id, invite.SessionId, invite.CommitteeSlotId, invite.Role, invite.CreatedAt, invite.ClaimedByUserId, invite.ClaimedAt, invite.RevokedAt);
    }

    private static IssuedInviteResponse ToResponse(IssuedInvite invite)
    {
        return new IssuedInviteResponse(invite.InviteId, invite.SessionId, invite.CommitteeSlotId, invite.Role, invite.FullName, invite.ShortName, invite.Token);
    }
}