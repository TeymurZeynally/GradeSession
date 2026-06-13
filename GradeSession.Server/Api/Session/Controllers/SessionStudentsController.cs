using GradeSession.Server.Api.Sessions.Contracts;
using GradeSession.Server.Services.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Sessions.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sessions/{sessionId}/students")]
public sealed class SessionStudentsController(ISessionService sessions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudentResponse>>> GetAll(string sessionId, CancellationToken cancellationToken)
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

        var students = await sessions.GetStudentsAsync(sessionId, cancellationToken);

        return Ok(students.Select(student => new StudentResponse(student.Id, student.FullName, student.ShortName, student.Topic, student.Comment)).ToArray());
    }
}