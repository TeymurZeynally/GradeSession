using GradeSession.Server.Api.Sessions.Contracts;
using GradeSession.Server.Domain.Sessions;
using GradeSession.Server.Services.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Sessions.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sessions/{sessionId}/committee")]
public sealed class SessionCommitteeController(ISessionService sessions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CommitteeSlotResponse>>> GetCommittee(string sessionId, CancellationToken cancellationToken)
    {
        var accessStatus = await sessions.CheckReadAccessAsync(sessionId, User.Identity!.Name!, cancellationToken);

        if (accessStatus == SessionOperationStatus.NotFound)
        {
            return NotFound();
        }

        if (accessStatus == SessionOperationStatus.Forbidden)
        {
            return Forbid();
        }

        var committeeSlots = await sessions.GetCommitteeSlotsAsync(sessionId, cancellationToken);

        return Ok(committeeSlots.Select(ToResponse).ToArray());
    }

    [HttpGet("participants")]
    public async Task<ActionResult<IReadOnlyList<SessionParticipantResponse>>> GetParticipants(string sessionId, CancellationToken cancellationToken)
    {
        var accessStatus = await sessions.CheckReadAccessAsync(sessionId, User.Identity!.Name!, cancellationToken);

        if (accessStatus == SessionOperationStatus.NotFound)
        {
            return NotFound();
        }

        if (accessStatus == SessionOperationStatus.Forbidden)
        {
            return Forbid();
        }

        var participants = await sessions.GetParticipantsAsync(sessionId, cancellationToken);

        return Ok(participants.Select(ToResponse).ToArray());
    }

    private static CommitteeSlotResponse ToResponse(CommitteeSlot slot)
    {
        return new CommitteeSlotResponse(slot.Id, slot.Role, slot.FullName, slot.ShortName, slot.ClaimedByUserId, slot.ClaimedAt);
    }

    private static SessionParticipantResponse ToResponse(SessionParticipant participant)
    {
        return new SessionParticipantResponse(participant.CommitteeSlotId, participant.UserId, participant.Role, participant.JoinedAt);
    }
}