namespace GradeSession.Server.Storage.Options;

public sealed class EtcdStorageOptions
{
    public required string ConnectionString { get; init; }

    public required string KeyPrefix { get; init; }

    public string? Username { get; init; }

    public string? Password { get; init; }

    public bool UseInsecureChannel { get; init; } = true;
}