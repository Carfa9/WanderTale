using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;          // för OpenApiInfo
using WanderTale;                // där AppDbContext ligger
using WanderTale.Models;         // där Trip ligger

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

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "WanderTale API v1");
});

app.MapGet("/trips", async (AppDbContext db) =>
    await db.Trips.ToListAsync());

app.MapPost("/trips", async (AppDbContext db, Trip trip) =>
{
    db.Trips.Add(trip);
    await db.SaveChangesAsync();
    return Results.Created($"/trips/{trip.Id}", trip);
});

app.Run();