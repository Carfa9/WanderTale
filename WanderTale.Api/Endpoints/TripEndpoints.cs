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
                var now = DateTime.UtcNow;

                var trip = new Trip
                {
                    Title = request.Title,
                    Destination = request.Destination,
                    Description = request.Description,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    CreatedAt = now,
                    UpdatedAt = now,
                    TravelModes = (request.TravelModes)
                        .Select(m => new TripTravelMode { Mode = m })
                        .ToList()
                };

                db.Trips.Add(trip);
                await db.SaveChangesAsync();

                return Results.Created($"/trips/{trip.Id}", new
                {
                    trip.Id,
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
            catch (Exception ex)
            {
                Console.WriteLine("POST /trips failed:");
                Console.WriteLine(ex.ToString());
                return Results.Problem(ex.ToString());
            }
        });
        
        app.MapPut("/trips/{id:guid}", async (AppDbContext db, Guid id, UpdateTripRequest request) =>
        {
            var trip = await db.Trips
                .Include(t => t.TravelModes)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (trip is null) return Results.NotFound();

            trip.Title = request.Title;
            trip.Destination = request.Destination;
            trip.Description = request.Description;
            trip.StartDate = request.StartDate;
            trip.EndDate = request.EndDate;
            trip.UpdatedAt = DateTime.UtcNow;

            db.TripTravelModes.RemoveRange(trip.TravelModes);
            trip.TravelModes = (request.TravelModes ?? [])
                .Select(m => new TripTravelMode { TripId = trip.Id, Mode = m })
                .ToList();

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                trip.Id,
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