using GradeSession.Server.Api.Results.Contracts;
using GradeSession.Server.Domain.Results;
using GradeSession.Server.Services.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Results.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sessions/{sessionId}/final-results")]
public sealed class SessionFinalResultsController(IResultService results) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<FinalResultsResponse>> Get(string sessionId, CancellationToken cancellationToken)
    {
        var result = await results.GetFinalResultsAsync(sessionId, User.Identity!.Name!, cancellationToken);

        return result.Status switch
        {
            ResultOperationStatus.Success => Ok(new FinalResultsResponse(result.Results.Select(ToResponse).ToArray())),
            ResultOperationStatus.NotFound => NotFound(),
            ResultOperationStatus.Forbidden => Forbid(),
            _ => Problem()
        };
    }

    [HttpPut]
    public async Task<ActionResult<FinalResultsResponse>> Save(string sessionId, SaveFinalResultsRequest request, CancellationToken cancellationToken)
    {
        var command = new SaveFinalResultsCommand(
            sessionId,
            User.Identity!.Name!,
            request.Results.Select(result => new SaveFinalStudentResultCommand(result.StudentId, result.FinalGrade)).ToArray());

        var result = await results.SaveFinalResultsAsync(command, cancellationToken);

        return result.Status switch
        {
            ResultOperationStatus.Success => Ok(new FinalResultsResponse(result.Results.Select(ToResponse).ToArray())),
            ResultOperationStatus.NotFound => NotFound(),
            ResultOperationStatus.Forbidden => Forbid(),
            ResultOperationStatus.SessionNotClosed => Conflict("Session is not closed."),
            ResultOperationStatus.UnknownStudent => BadRequest("Unknown student."),
            ResultOperationStatus.FinalGradeOutOfRange => BadRequest("Final grade out of range."),
            _ => Problem()
        };
    }

    private static FinalStudentResultResponse ToResponse(FinalStudentResult result)
    {
        return new FinalStudentResultResponse(result.StudentId, result.FinalGrade, result.UpdatedByUserId, result.CreatedAt, result.UpdatedAt);
    }
}