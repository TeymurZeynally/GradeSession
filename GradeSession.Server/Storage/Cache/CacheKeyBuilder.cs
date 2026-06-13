namespace GradeSession.Server.Storage.Cache;

public static class CacheKeyBuilder
{
    private const string Prefix = "/grading/v1";

    public static string User(string userId)
        => $"{Prefix}/users/{userId}";

    public static string UserSessionIds(string userId)
        => $"{Prefix}/users/{userId}/session-ids";

    public static string Session(string sessionId)
        => $"{Prefix}/sessions/{sessionId}";

    public static string SessionStudentIds(string sessionId)
        => $"{Prefix}/sessions/{sessionId}/student-ids";

    public static string SessionStudent(string sessionId, string studentId)
        => $"{Prefix}/sessions/{sessionId}/students/{studentId}";

    public static string SessionCriterionIds(string sessionId)
        => $"{Prefix}/sessions/{sessionId}/criterion-ids";

    public static string SessionCriterion(string sessionId, string criterionId)
        => $"{Prefix}/sessions/{sessionId}/criteria/{criterionId}";

    public static string SessionCommitteeSlotIds(string sessionId)
        => $"{Prefix}/sessions/{sessionId}/committee-slot-ids";

    public static string SessionCommitteeSlot(string sessionId, string committeeSlotId)
        => $"{Prefix}/sessions/{sessionId}/committee-slots/{committeeSlotId}";

    public static string SessionParticipantCommitteeSlotIds(string sessionId)
        => $"{Prefix}/sessions/{sessionId}/participant-slot-ids";

    public static string SessionParticipant(string sessionId, string committeeSlotId)
        => $"{Prefix}/sessions/{sessionId}/participants/{committeeSlotId}";

    public static string SessionInviteIds(string sessionId)
        => $"{Prefix}/sessions/{sessionId}/invite-ids";

    public static string Invite(string inviteId)
        => $"{Prefix}/invites/{inviteId}";

    public static string InviteByTokenHash(string tokenHash)
        => $"{Prefix}/invites/by-token-hash/{tokenHash}";

    public static string SessionAssessmentCommitteeSlotIds(string sessionId)
        => $"{Prefix}/sessions/{sessionId}/assessments/committee-slot-ids";

    public static string CommitteeSlotAssessmentStudentIds(string sessionId, string committeeSlotId)
        => $"{Prefix}/sessions/{sessionId}/assessments/{committeeSlotId}/student-ids";

    public static string StudentAssessment(string sessionId, string committeeSlotId, string studentId)
        => $"{Prefix}/sessions/{sessionId}/assessments/{committeeSlotId}/{studentId}";

    public static string SessionFinalResultStudentIds(string sessionId)
        => $"{Prefix}/sessions/{sessionId}/final-results/student-ids";

    public static string SessionFinalResult(string sessionId, string studentId)
        => $"{Prefix}/sessions/{sessionId}/final-results/{studentId}";
}