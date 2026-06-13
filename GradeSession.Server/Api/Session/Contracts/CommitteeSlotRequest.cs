using System.ComponentModel.DataAnnotations;
using GradeSession.Server.Domain.Sessions;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record CommitteeSlotRequest(
    [Required]
    SessionParticipantRole Role,

    [Required]
    [StringLength(200, MinimumLength = 1)]
    string FullName,

    [Required]
    [StringLength(80, MinimumLength = 1)]
    string ShortName);