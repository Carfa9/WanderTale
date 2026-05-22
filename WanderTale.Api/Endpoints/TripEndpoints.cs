using Microsoft.EntityFrameworkCore;
using WanderTale.Dto;
using WanderTale.Models;

namespace WanderTale.Endpoints;

public static class TripEndpoints
{
    public static void MapTripEndpoints(this WebApplication app)
    {
        app.MapGet("/trips", async (AppDbContext db) =>
            await db.Trips
                .Include(t => t.TravelModes)
                .OrderBy(t => t.StartDate ?? t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.ClientId,
                    t.Title,
                    t.Destination,
                    t.StartDate,
                    t.EndDate,
                    t.Description,
                    TravelModes = t.TravelModes.Select(x => x.Mode).ToList()
                })
                .ToListAsync());
        
        app.MapGet("/trips/{id:guid}", async (AppDbContext db, Guid id) =>
        {
            var trip = await db.Trips
                .Include(t => t.TravelModes)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (trip == null)
                return Results.NotFound();
    
            return Results.Ok(new
            {
                trip.Id,
                trip.ClientId,
                trip.Title,
                trip.Destination,
                trip.StartDate,
                trip.EndDate,
                trip.Description,
                TravelModes = trip.TravelModes.Select(x => x.Mode).ToList()
            });
        });
        
        app.MapPost("/trips", async (AppDbContext db, CreateTripRequest request) =>
        {
            try
            {
                if (EndpointValidation.ValidateTitle(request.Title) is { } titleError)
                    return titleError;

                if (EndpointValidation.ValidateDateRange(request.StartDate, request.EndDate) is { } dateError)
                    return dateError;

                if (!string.IsNullOrWhiteSpace(request.ClientId))
                {
                    var existingTrip = await db.Trips
                        .Include(t => t.TravelModes)
                        .FirstOrDefaultAsync(t => t.ClientId == request.ClientId);

                    if (existingTrip is not null)
                    {
                        return Results.Ok(new
                        {
                            existingTrip.Id,
                            existingTrip.ClientId,
                            existingTrip.Title,
                            existingTrip.Destination,
                            existingTrip.StartDate,
                            existingTrip.EndDate,
                            existingTrip.Description,
                            existingTrip.CreatedAt,
                            existingTrip.UpdatedAt,
                            TravelModes = existingTrip.TravelModes.Select(x => x.Mode).ToList()
                        });
                    }
                }

                var now = DateTime.UtcNow;
                var travelModes = EndpointValidation.NormalizeTravelModes(request.TravelModes);

                var trip = new Trip
                {
                    ClientId = string.IsNullOrWhiteSpace(request.ClientId) ? null : request.ClientId,
                    Title = request.Title.Trim(),
                    Destination = request.Destination,
                    Description = request.Description,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    CreatedAt = now,
                    UpdatedAt = now,
                    TravelModes = travelModes
                        .Select(m => new TripTravelMode { Mode = m })
                        .ToList()
                };

                db.Trips.Add(trip);
                await db.SaveChangesAsync();

                return Results.Created($"/trips/{trip.Id}", new
                {
                    trip.Id,
                    trip.ClientId,
                    trip.Title,
                    trip.Destination,
                    trip.StartDate,
                    trip.EndDate,
                    trip.Description,
                    trip.CreatedAt,
                    trip.UpdatedAt,
                    TravelModes = trip.TravelModes.Select(x => x.Mode)
                });
            }
            catch (Exception)
            {
                return Results.Problem("Could not create trip.");
            }
        });
        
        app.MapPut("/trips/{id:guid}", async (AppDbContext db, Guid id, UpdateTripRequest request) =>
        {
            if (EndpointValidation.ValidateTitle(request.Title) is { } titleError)
                return titleError;

            if (EndpointValidation.ValidateDateRange(request.StartDate, request.EndDate) is { } dateError)
                return dateError;

            var trip = await db.Trips
                .Include(t => t.TravelModes)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (trip is null) return Results.NotFound();

            var travelModes = EndpointValidation.NormalizeTravelModes(request.TravelModes);

            trip.Title = request.Title.Trim();
            trip.Destination = request.Destination;
            trip.Description = request.Description;
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.UpdatedAt = DateTime.UtcNow;

            db.TripTravelModes.RemoveRange(trip.TravelModes);
            trip.TravelModes = travelModes
                .Select(m => new TripTravelMode { TripId = trip.Id, Mode = m })
                .ToList();

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                trip.Id,
                trip.ClientId,
                trip.Title,
                trip.Destination,
                trip.StartDate,
                trip.EndDate,
                trip.Description,
                TravelModes = trip.TravelModes.Select(x => x.Mode).ToList()
            });
        });

        app.MapDelete("/trips/{id:guid}", async (AppDbContext db, Guid id, IWebHostEnvironment env) =>
        {
            var trip = await db.Trips
                .Include(t => t.Photos)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (trip is null) return Results.NotFound();

            var root = string.IsNullOrWhiteSpace(env.WebRootPath)
                ? Path.Combine(env.ContentRootPath, "wwwroot")
                : env.WebRootPath;

            foreach (var photo in trip.Photos)
            {
                var filePath = Path.Combine(root, photo.ImageUri.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(filePath)) File.Delete(filePath);
            }

            db.Trips.Remove(trip);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
