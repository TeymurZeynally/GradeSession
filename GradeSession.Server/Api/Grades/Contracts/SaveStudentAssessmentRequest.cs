using System.ComponentModel.DataAnnotations;
using GradeSession.Server.Domain.Grades;

namespace GradeSession.Server.Api.Grades.Contracts;

public sealed record SaveStudentAssessmentRequest(
    [EnumDataType(typeof(StudentAssessmentPresence))]
    StudentAssessmentPresence Presence,

    [Required]
    [MaxLength(50)]
    IReadOnlyList<SaveCriterionAssessmentRequest> Criteria,

    [Range(0, 1000)]
    double? FinalGrade);