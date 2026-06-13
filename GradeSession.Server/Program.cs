using System.Text.Json.Serialization;
using GradeSession.Server.Security.Jwt;
using GradeSession.Server.Security.RateLimiting;
using GradeSession.Server.Security.RequestLimits.Options;
using GradeSession.Server.Services;
using GradeSession.Server.Storage;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

var requestLimits = builder.Configuration.GetSection(RequestLimitOptions.SectionName).Get<RequestLimitOptions>() ?? new RequestLimitOptions();
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = requestLimits.Enabled ? builder.Configuration.GetValue<long>("RequestLimits:MaxRequestBodySizeBytes") : null;
    serverOptions.Limits.RequestHeadersTimeout = requestLimits.Enabled ? TimeSpan.FromSeconds(builder.Configuration.GetValue<int>("RequestLimits:RequestHeadersTimeoutSeconds")) : serverOptions.Limits.RequestHeadersTimeout;
});

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddSwaggerGen(o =>
{
    o.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT", 
        Description = "Paste a JWT access token here."
    });

    o.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = []
    });
});


builder.Services.AddGradeSessionStorage();
builder.Services.AddGradeSessionServices(builder.Configuration);
builder.Services.AddGradeSessionSecurity(builder.Configuration);
builder.Services.AddGradeSessionRateLimiting(builder.Configuration);

var app = builder.Build();

app.UseDefaultFiles();
app.MapStaticAssets();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();