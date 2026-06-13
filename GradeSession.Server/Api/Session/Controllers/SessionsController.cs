using GradeSession.Server.Api.Sessions.Contracts;
using GradeSession.Server.Domain.Sessions;
using GradeSession.Server.Services.Sessions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GradeSession.Server.Api.Sessions.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sessions")]
public sealed class SessionsController(ISessionService sessions) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CreateSessionResponse>> Create(CreateSessionRequest request, CancellationToken cancellationToken)
    {
        ValidateCreateSessionRanges(request);

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var command = new CreateSessionCommand(
            User.Identity!.Name!,
            request.Title,
            request.Settings is null ? null : new CreateSessionSettingsCommand(request.Settings.FinalGradeMinScore, request.Settings.FinalGradeMaxScore),
            request.Students.Select(student => new CreateStudentCommand(student.FullName, student.ShortName, student.Topic, student.Comment)).ToArray(),
            request.Criteria.Select(criterion => new CreateCriterionCommand(criterion.Title, criterion.Description, criterion.MinScore, criterion.MaxScore, criterion.Weight)).ToArray(),
            request.Committee.Select(member => new CreateCommitteeSlotCommand(member.Role, member.FullName, member.ShortName)).ToArray());

        var result = await sessions.CreateAsync(command, cancellationToken);

        return Ok(new CreateSessionResponse(
            result.Session.Id,
            result.Session.Title,
            result.Session.Status,
            ToResponse(result.Session.Settings),
            result.Session.CreatedAt,
            result.Session.UpdatedAt,
            result.Students.Select(ToResponse).ToArray(),
            result.Criteria.Select(ToResponse).ToArray(),
            result.CommitteeSlots.Select(ToResponse).ToArray()));
    }

    [HttpGet("{sessionId}")]
    public async Task<ActionResult<SessionResponse>> GetById(string sessionId, CancellationToken cancellationToken)
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

        var session = await sessions.GetByIdAsync(sessionId, cancellationToken);

        if (session is null)
        {
            return NotFound();
        }

        var students = await sessions.GetStudentsAsync(sessionId, cancellationToken);
        var criteria = await sessions.GetCriteriaAsync(sessionId, cancellationToken);
        var committeeSlots = await sessions.GetCommitteeSlotsAsync(sessionId, cancellationToken);

        return Ok(new SessionResponse(
            session.Id,
            session.Title,
            session.CreatedByUserId,
            session.Status,
            ToResponse(session.Settings),
            session.CreatedAt,
            session.UpdatedAt,
            students.Select(ToResponse).ToArray(),
            criteria.Select(ToResponse).ToArray(),
            committeeSlots.Select(ToResponse).ToArray()));
    }

    [HttpGet("{sessionId}/progress")]
    public async Task<ActionResult<SessionProgressResponse>> GetProgress(string sessionId, CancellationToken cancellationToken)
    {
        var result = await sessions.GetProgressAsync(sessionId, User.Identity!.Name!, cancellationToken);

        return result.Status switch
        {
            SessionOperationStatus.Success => Ok(new SessionProgressResponse(result.SessionId!, result.StudentsCount, result.CriteriaCount, result.Committee.Select(ToResponse).ToArray())),
            SessionOperationStatus.NotFound => NotFound(),
            SessionOperationStatus.Forbidden => Forbid(),
            _ => Problem()
        };
    }

    [HttpPost("{sessionId}/close")]
    public async Task<IActionResult> Close(string sessionId, CancellationToken cancellationToken)
    {
        var status = await sessions.CloseAsync(sessionId, User.Identity!.Name!, cancellationToken);

        return status switch
        {
            SessionOperationStatus.Success => NoContent(),
            SessionOperationStatus.NotFound => NotFound(),
            SessionOperationStatus.Forbidden => Forbid(),
            _ => Problem()
        };
    }

    private void ValidateCreateSessionRanges(CreateSessionRequest request)
    {
        var finalGradeMinScore = request.Settings?.FinalGradeMinScore ?? 2;
        var finalGradeMaxScore = request.Settings?.FinalGradeMaxScore ?? 5;

        if (finalGradeMinScore > finalGradeMaxScore)
        {
            ModelState.AddModelError("settings.finalGradeMinScore", "Final grade minimum score must be less than or equal to final grade maximum score.");
        }

        for (var i = 0; i < request.Criteria.Count; i++)
        {
            var criterion = request.Criteria[i];

            var minScore = criterion.MinScore ?? 2;
            var maxScore = criterion.MaxScore ?? 5;

            if (minScore > maxScore)
            {
                ModelState.AddModelError($"criteria[{i}].minScore", "Criterion minimum score must be less than or equal to criterion maximum score.");
            }
        }
    }

    private static SessionSettingsResponse ToResponse(SessionSettings settings)
    {
        return new SessionSettingsResponse(settings.FinalGradeMinScore, settings.FinalGradeMaxScore);
    }

    private static StudentResponse ToResponse(Student student)
    {
        return new StudentResponse(student.Id, student.FullName, student.ShortName, student.Topic, student.Comment);
    }

    private static CriterionResponse ToResponse(Criterion criterion)
    {
        return new CriterionResponse(criterion.Id, criterion.Title, criterion.Description, criterion.MinScore, criterion.MaxScore, criterion.Weight);
    }

    private static CommitteeSlotResponse ToResponse(CommitteeSlot slot)
    {
        return new CommitteeSlotResponse(slot.Id, slot.Role, slot.FullName, slot.ShortName, slot.ClaimedByUserId, slot.ClaimedAt);
    }

    private static CommitteeSlotProgressResponse ToResponse(CommitteeSlotProgress progress)
    {
        return new CommitteeSlotProgressResponse(
            progress.CommitteeSlotId,
            progress.ClaimedByUserId,
            progress.TotalStudents,
            progress.StudentsWithAnyAssessment,
            progress.CompletedStudents,
            progress.TotalCriterionScores,
            progress.FilledCriterionScores,
            progress.TotalFinalGrades,
            progress.FilledFinalGrades);
    }
}