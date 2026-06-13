using GradeSession.Server.Security.Jwt.Models;

namespace GradeSession.Server.Security.Jwt.Services;

public interface IJwtTokenService
{
    JwtTokenResult CreateToken(string userId);
}