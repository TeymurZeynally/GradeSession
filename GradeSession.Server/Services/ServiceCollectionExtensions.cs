using GradeSession.Server.Services.Auth;
using GradeSession.Server.Services.Grades;
using GradeSession.Server.Services.Invites;
using GradeSession.Server.Services.Results;
using GradeSession.Server.Services.Sessions;
using GradeSession.Server.Services.Users;

namespace GradeSession.Server.Services;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddGradeSessionServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<InviteOptions>(configuration.GetSection("Invites"));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<IInviteService, InviteService>();
        services.AddScoped<IGradeService, GradeService>();
        services.AddScoped<IResultService, ResultService>();

        return services;
    }
}