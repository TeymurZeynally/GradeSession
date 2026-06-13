namespace GradeSession.Server.Storage.Options;

public sealed class GradeSessionStorageOptions
{
    public const string SectionName = "Storage";

    public StorageProvider Provider { get; init; } = StorageProvider.Memory;

    public EtcdStorageOptions? Etcd { get; init; }
}
