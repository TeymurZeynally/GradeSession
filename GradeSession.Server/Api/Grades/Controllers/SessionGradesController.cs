using GradeSession.Server.Api.Grades.Contracts;
using GradeSession.Server.Domain.Grades;
using GradeSession.Server.Services.Grades;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Grades.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sessions/{sessionId}/grades")]
public sealed class SessionGradesController(IGradeService grades) : ControllerBase
{
    [HttpGet("slots/{committeeSlotId}")]
    public async Task<ActionResult<CommitteeSlotAssessmentsResponse>> GetCommitteeSlotAssessments(string sessionId, string committeeSlotId, CancellationToken cancellationToken)
    {
        var result = await grades.GetCommitteeSlotAssessmentsAsync(sessionId, committeeSlotId, User.Identity!.Name!, cancellationToken);

        return result.Status switch
        {
            GradeOperationStatus.Success => Ok(new CommitteeSlotAssessmentsResponse(result.Assessments.Select(ToResponse).ToArray())),
            GradeOperationStatus.NotFound => NotFound(),
            GradeOperationStatus.Forbidden => Forbid(),
            GradeOperationStatus.CommitteeSlotNotFound => NotFound(),
            GradeOperationStatus.SessionClosed => Conflict("Session is closed."),
            _ => Problem()
        };
    }

    [HttpGet("slots/{committeeSlotId}/students/{studentId}")]
    public async Task<ActionResult<StudentAssessmentResponse>> GetStudentAssessment(string sessionId, string committeeSlotId, string studentId, CancellationToken cancellationToken)
    {
        var result = await grades.GetStudentAssessmentAsync(sessionId, committeeSlotId, studentId, User.Identity!.Name!, cancellationToken);

        return result.Status switch
        {
            GradeOperationStatus.Success when result.Assessment is not null => Ok(ToResponse(result.Assessment)),
            GradeOperationStatus.Success => NotFound(),
            GradeOperationStatus.NotFound => NotFound(),
            GradeOperationStatus.Forbidden => Forbid(),
            GradeOperationStatus.CommitteeSlotNotFound => NotFound(),
            GradeOperationStatus.SessionClosed => Conflict("Session is closed."),
            _ => Problem()
        };
    }

    [HttpPut("slots/{committeeSlotId}/students/{studentId}")]
    public async Task<ActionResult<StudentAssessmentResponse>> SaveStudentAssessment(string sessionId, string committeeSlotId, string studentId, SaveStudentAssessmentRequest request, CancellationToken cancellationToken)
    {
        var command = new SaveStudentAssessmentCommand(
            sessionId,
            committeeSlotId,
            studentId,
            User.Identity!.Name!,
            request.Presence,
            request.Criteria.Select(criterion => new SaveCriterionAssessmentCommand(criterion.CriterionId, criterion.Score)).ToArray(),
            request.FinalGrade);

        var result = await grades.SaveStudentAssessmentAsync(command, cancellationToken);

        return result.Status switch
        {
            GradeOperationStatus.Success => Ok(ToResponse(result.Assessment!)),
            GradeOperationStatus.NotFound => NotFound(),
            GradeOperationStatus.StudentNotFound => NotFound(),
            GradeOperationStatus.Forbidden => Forbid(),
            GradeOperationStatus.CommitteeSlotNotFound => NotFound(),
            GradeOperationStatus.UnknownCriterion => BadRequest("Unknown criterion."),
            GradeOperationStatus.DuplicateCriterion => BadRequest("Duplicate criterion."),
            GradeOperationStatus.CriterionScoreOutOfRange => BadRequest("Criterion score out of range."),
            GradeOperationStatus.FinalGradeOutOfRange => BadRequest("Final grade out of range."),
            GradeOperationStatus.SessionClosed => Conflict("Session is closed."),
            _ => Problem()
        };
    }

    private static StudentAssessmentResponse ToResponse(StudentAssessment assessment)
    {
        return new StudentAssessmentResponse(
            assessment.SessionId,
            assessment.StudentId,
            assessment.CommitteeSlotId,
            assessment.Presence,
            assessment.Criteria.Select(ToResponse).ToArray(),
            assessment.FinalGrade,
            assessment.CreatedAt,
            assessment.UpdatedAt);
    }

    private static CriterionAssessmentResponse ToResponse(CriterionAssessment assessment)
    {
        return new CriterionAssessmentResponse(assessment.CriterionId, assessment.Score);
    }
}