using System.ComponentModel.DataAnnotations;

namespace GradeSession.Server.Api.Results.Contracts;

public sealed record SaveFinalResultsRequest(
    [Required]
    [MinLength(1)]
    [MaxLength(300)]
    IReadOnlyList<SaveFinalStudentResultRequest> Results);