using GradeSession.Server.Storage.Cache;
using GradeSession.Server.Storage.Grades;
using GradeSession.Server.Storage.Invites;
using GradeSession.Server.Storage.Results;
using GradeSession.Server.Storage.Sessions;
using GradeSession.Server.Storage.Users;

namespace GradeSession.Server.Storage;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddGradeSessionStorage(this IServiceCollection services)
    {
        services.AddDistributedMemoryCache();

        services.AddScoped<ICacheStore, DistributedCacheStore>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();
        services.AddScoped<IInviteRepository, InviteRepository>();
        services.AddScoped<IGradeRepository, GradeRepository>();
        services.AddScoped<IResultRepository, ResultRepository>();

        return services;
    }
}