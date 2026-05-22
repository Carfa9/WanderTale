namespace WanderTale.Endpoints;

public static class ThemeEndpoints
{
    public static void MapThemesEndpoints(this WebApplication app)
    {
        app.MapPost("/dev/save-theme", async (HttpRequest req, IWebHostEnvironment env) =>
        {
            var content = await new StreamReader(req.Body).ReadToEndAsync();
            var themePath = Path.GetFullPath(
                Path.Combine(env.ContentRootPath, "..", "WanderTale.Web", "constants", "theme.ts")
            );
            await File.WriteAllTextAsync(themePath, content);
            return Results.Ok(new { path = themePath });
        }).RequireAuthorization();
    }
}