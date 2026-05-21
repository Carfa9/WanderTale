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
                    s.ClientId,
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
                if (!string.IsNullOrWhiteSpace(request.ClientId))
                {
                    var existingStop = await db.Stops
                        .Include(s => s.TravelModes)
                        .FirstOrDefaultAsync(s => s.ClientId == request.ClientId);

                    if (existingStop is not null)
                    {
                        return Results.Ok(new
                        {
                            existingStop.Id,
                            existingStop.ClientId,
                            existingStop.TripId,
                            existingStop.Title,
                            existingStop.Description,
                            existingStop.StartDate,
                            existingStop.EndDate,
                            existingStop.CreatedAt,
                            existingStop.UpdatedAt,
                            existingStop.Country,
                            existingStop.OrderIndex,
                            TravelModes = existingStop.TravelModes.Select(x => x.Mode).ToList()
                        });
                    }
                }

                var now = DateTime.UtcNow;

                var nextOrderIndex = await db.Stops
                    .Where(s => s.TripId == tripId)
                    .MaxAsync(s => (int?)s.OrderIndex) ?? 0;
        
                var stop = new Stop
                {
                    Id = Guid.NewGuid(),
                    ClientId = string.IsNullOrWhiteSpace(request.ClientId) ? null : request.ClientId,
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
                        .Distinct()
                        .Select(m => new StopTravelMode { Mode = m })
                        .ToList()
                };

                db.Stops.Add(stop);
                await db.SaveChangesAsync();

                return Results.Created($"/trips/{tripId}/stops/{stop.Id}", new
                {
                    stop.Id,
                    stop.ClientId,
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
            catch (Exception)
            {
                return Results.Problem("Could not create stop.");
            }
        });
    }
}
