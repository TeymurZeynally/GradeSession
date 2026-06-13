using System.ComponentModel.DataAnnotations;

namespace GradeSession.Server.Api.Sessions.Contracts;

public sealed record CreateSessionRequest(
    [Required]
    [StringLength(160, MinimumLength = 1)]
    string Title,

    SessionSettingsRequest? Settings,

    [Required]
    [MinLength(1)]
    [MaxLength(300)]
    IReadOnlyList<StudentRequest> Students,

    [Required]
    [MinLength(1)]
    [MaxLength(50)]
    IReadOnlyList<CriterionRequest> Criteria,

    [Required]
    [MinLength(1)]
    [MaxLength(50)]
    IReadOnlyList<CommitteeSlotRequest> Committee);