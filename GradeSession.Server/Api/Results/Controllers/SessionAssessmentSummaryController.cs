using GradeSession.Server.Api.Results.Contracts;
using GradeSession.Server.Domain.Grades;
using GradeSession.Server.Services.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Results.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sessions/{sessionId}/assessment-summary")]
public sealed class SessionAssessmentSummaryController(IResultService results) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AssessmentSummaryResponse>> Get(string sessionId, CancellationToken cancellationToken)
    {
        var result = await results.GetAssessmentSummaryAsync(sessionId, User.Identity!.Name!, cancellationToken);

        return result.Status switch
        {
            ResultOperationStatus.Success => Ok(new AssessmentSummaryResponse(result.Assessments.Select(ToResponse).ToArray())),
            ResultOperationStatus.NotFound => NotFound(),
            ResultOperationStatus.Forbidden => Forbid(),
            ResultOperationStatus.SessionNotClosed => Conflict("Session is not closed."),
            _ => Problem()
        };
    }

    private static StudentAssessmentSummaryResponse ToResponse(StudentAssessment assessment)
    {
        return new StudentAssessmentSummaryResponse(
            assessment.SessionId,
            assessment.StudentId,
            assessment.CommitteeSlotId,
            assessment.Presence,
            assessment.Criteria.Select(ToResponse).ToArray(),
            assessment.FinalGrade,
            assessment.CreatedAt,
            assessment.UpdatedAt);
    }

    private static CriterionAssessmentSummaryResponse ToResponse(CriterionAssessment assessment)
    {
        return new CriterionAssessmentSummaryResponse(assessment.CriterionId, assessment.Score);
    }
}