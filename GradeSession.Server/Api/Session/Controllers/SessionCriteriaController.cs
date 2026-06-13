using GradeSession.Server.Api.Sessions.Contracts;
using GradeSession.Server.Services.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Sessions.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sessions/{sessionId}/criteria")]
public sealed class SessionCriteriaController(ISessionService sessions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CriterionResponse>>> GetAll(string sessionId, CancellationToken cancellationToken)
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

        var criteria = await sessions.GetCriteriaAsync(sessionId, cancellationToken);

        return Ok(criteria.Select(criterion => new CriterionResponse(criterion.Id, criterion.Title, criterion.Description, criterion.MinScore, criterion.MaxScore, criterion.Weight)).ToArray());
    }
}