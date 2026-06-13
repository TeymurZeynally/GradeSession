namespace GradeSession.Server.Services.Invites;

public sealed class InviteOptions
{
    public InviteClaimMode ClaimMode { get; init; } = InviteClaimMode.Reject;

    public int TokenByteLength { get; init; } = 32;
}