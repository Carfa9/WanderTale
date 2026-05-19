using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using WanderTale;
using WanderTale.Dto;
using WanderTale.Endpoints;
using WanderTale.Models;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=wanderTale.db"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WanderTale API",
        Version = "v1"
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseCors("AllowFrontend");

app.UseStaticFiles();

app.UseSwagger();
app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "WanderTale API v1"); });

app.MapTripEndpoints();
app.MapStopEndpoints();
app.MapPhotosEndpoints();
app.MapEntriesEndpoints();
app.MapThemesEndpoints();

app.Run();

public partial class Program
{
}
