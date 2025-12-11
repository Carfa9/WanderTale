using Microsoft.EntityFrameworkCore;
using WanderTale;
using WanderTale.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=wanderTale.db"));

var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/trips", async (AppDbContext dbContext) =>
    await dbContext.Trips.ToListAsync());

app.MapPost("/trips", async (AppDbContext dbContext, Trip trip) =>
{
    dbContext.Trips.Add(trip);
    await dbContext.SaveChangesAsync();
    return Results.Created($"/trips/{trip.Id}", trip);
});

app.Run();
