FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS with-node

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash
RUN apt-get -y install nodejs

ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["GradeSession.Server/GradeSession.Server.csproj", "GradeSession.Server/"]
COPY ["GradeSession.Client/GradeSession.Client.esproj", "GradeSession.Client/"]
RUN dotnet restore "./GradeSession.Server/GradeSession.Server.csproj"
COPY . .
WORKDIR "/src/GradeSession.Server"
RUN dotnet build "./GradeSession.Server.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM with-node AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./GradeSession.Server.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GradeSession.Server.dll"]