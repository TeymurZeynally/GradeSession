using System.Text.Json;
using dotnet_etcd;
using Microsoft.Extensions.Options;
using GradeSession.Server.Storage.Options;

namespace GradeSession.Server.Storage.Cache;

public sealed class EtcdCacheStore(
    EtcdClient client,
    IOptions<GradeSessionStorageOptions> options) : ICacheStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string keyPrefix = NormalizePrefix(options.Value.Etcd!.KeyPrefix);

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        var response = await client.GetAsync(
            BuildKey(key),
            cancellationToken: cancellationToken);

        if (response.Count == 0)
        {
            return default;
        }

        var json = response.Kvs[0].Value.ToStringUtf8();

        if (string.IsNullOrWhiteSpace(json))
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(json, JsonOptions);
    }

    public async Task SetAsync<T>(string key, T value, CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(value, JsonOptions);

        await client.PutAsync(
            BuildKey(key),
            json,
            cancellationToken: cancellationToken);
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        await client.DeleteAsync(
            BuildKey(key),
            cancellationToken: cancellationToken);
    }

    private string BuildKey(string key)
    {
        var normalizedKey = key.TrimStart('/');

        return string.IsNullOrWhiteSpace(keyPrefix)
            ? $"/{normalizedKey}"
            : $"{keyPrefix}/{normalizedKey}";
    }

    private static string NormalizePrefix(string prefix)
    {
        if (string.IsNullOrWhiteSpace(prefix))
        {
            return string.Empty;
        }

        return "/" + prefix.Trim().Trim('/');
    }
}