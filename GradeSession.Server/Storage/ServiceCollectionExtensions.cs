using dotnet_etcd;
using GradeSession.Server.Storage.Cache;
using GradeSession.Server.Storage.Grades;
using GradeSession.Server.Storage.Invites;
using GradeSession.Server.Storage.Options;
using GradeSession.Server.Storage.Results;
using GradeSession.Server.Storage.Sessions;
using GradeSession.Server.Storage.Users;
using Grpc.Core;
using Grpc.Net.Client;

namespace GradeSession.Server.Storage;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddGradeSessionStorage(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var section = configuration.GetSection(GradeSessionStorageOptions.SectionName);

        var storageOptions = new GradeSessionStorageOptions();
        section.Bind(storageOptions);

        services
            .AddOptions<GradeSessionStorageOptions>()
            .Bind(section)
            .ValidateOnStart();

        switch (storageOptions.Provider)
        {
            case StorageProvider.Memory:
                services.AddDistributedMemoryCache();
                services.AddScoped<ICacheStore, DistributedCacheStore>();
                break;

            case StorageProvider.Etcd:
                services.AddSingleton(_ => CreateEtcdClient(storageOptions.Etcd!));
                services.AddScoped<ICacheStore, EtcdCacheStore>();
                break;

            default:
                throw new InvalidOperationException(
                    $"Unsupported storage provider '{storageOptions.Provider}'.");
        }

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IInviteRepository, InviteRepository>();
        services.AddScoped<IGradeRepository, GradeRepository>();
        services.AddScoped<IResultRepository, ResultRepository>();

        return services;
    }

    private static EtcdClient CreateEtcdClient(EtcdStorageOptions options)
    {
        var configureChannelOptions = CreateChannelOptionsConfigurator(options);

        if (!string.IsNullOrWhiteSpace(options.Username))
        {
            if (string.IsNullOrWhiteSpace(options.Password))
            {
                throw new InvalidOperationException("Storage:Etcd:Password is required when Storage:Etcd:Username is configured.");
            }

            return new EtcdClient(options.ConnectionString, options.Username, options.Password, configureChannelOptions: configureChannelOptions);
        }

        return new EtcdClient(options.ConnectionString, configureChannelOptions: configureChannelOptions);
    }

    private static Action<GrpcChannelOptions>? CreateChannelOptionsConfigurator(
        EtcdStorageOptions options)
    {
        if (!options.UseInsecureChannel)
        {
            return null;
        }

        return channelOptions =>
        {
            channelOptions.Credentials = ChannelCredentials.Insecure;
        };
    }
}