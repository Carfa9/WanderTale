using Microsoft.EntityFrameworkCore;
using WanderTale.Dto;
using WanderTale.Models;

namespace WanderTale.Endpoints;

public static class StopEndpoints
{
    public static void MapStopEndpoints(this WebApplication app)
    {
        app.MapGet("/trips/{tripId:guid}/stops", async (AppDbContext db, Guid tripId) =>
        {
            var stops = await db.Stops
                .Include(s => s.TravelModes)
                .Where(s => s.TripId == tripId)
                .OrderBy(s => s.OrderIndex)
                .Select(s => new
                {
                    s.Id,
                    s.TripId,
                    s.Title,
                    s.Description,
                    s.StartDate,
                    s.EndDate,
                    s.Country,
                    s.OrderIndex,
                    s.CreatedAt,
                    s.UpdatedAt,
                    TravelModes = s.TravelModes.Select(x => x.Mode).ToList(),
                }).ToListAsync();

            return Results.Ok(stops);

        });
        
        app.MapPost("/trips/{tripId:guid}/stops", async (AppDbContext db, Guid tripId, CreateStopRequest request) =>
        {
            try
            {
                var now = DateTime.UtcNow;

                var nextOrderIndex = await db.Stops
                    .Where(s => s.TripId == tripId)
                    .MaxAsync(s => (int?)s.OrderIndex) ?? 0;
        
                var stop = new Stop
                {
                    Id = Guid.NewGuid(),
                    TripId = tripId,
                    Title = request.Title,
                    Description = request.Description,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    Country = request.Country,
                    OrderIndex = nextOrderIndex + 1,
                    CreatedAt = now,
                    UpdatedAt = now,
                    TravelModes = (request.TravelModes ?? [])
                        .Select(m => new StopTravelMode { Mode = m })
                        .ToList()
                };

                db.Stops.Add(stop);
                await db.SaveChangesAsync();

                return Results.Created($"/trips/{tripId}/stops/{stop.Id}", new
                {
                    stop.Id,
                    stop.TripId,
                    stop.Title,
                    stop.Description,
                    stop.StartDate,
                    stop.EndDate,
                    stop.CreatedAt,
                    stop.UpdatedAt,
                    stop.Country,
                    stop.OrderIndex,
                    TravelModes = stop.TravelModes.Select(x => x.Mode)
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("POST /stops failed:");
                Console.WriteLine(ex.ToString());
                return Results.Problem(ex.ToString());
            }
        });
    }
}