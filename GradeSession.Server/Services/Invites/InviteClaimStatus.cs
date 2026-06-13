namespace GradeSession.Server.Services.Invites;

public enum InviteClaimStatus
{
    Claimed = 0,
    AlreadyClaimedByCurrentUser = 1,
    AlreadyClaimedByAnotherUser = 2,
    NotFound = 3,
    Revoked = 4,
    SessionNotFound = 5,
    CommitteeSlotNotFound = 6
}