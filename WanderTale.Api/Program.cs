using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi; // för OpenApiInfo
using WanderTale;
using WanderTale.Dto; // där AppDbContext ligger
using WanderTale.Models; // där Trip ligger

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
    var conn = db.Database.GetDbConnection();

    var tables = await db.Database
        .SqlQueryRaw<string>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        .ToListAsync();

    app.Logger.LogInformation("Tables: {Tables}", string.Join(", ", tables));

    app.Logger.LogInformation("DB file: {Db}", conn.DataSource);
    app.Logger.LogInformation("CWD: {Cwd}", Directory.GetCurrentDirectory());
}


using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseCors("AllowFrontend");

app.UseSwagger();
app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "WanderTale API v1"); });

app.MapGet("/trips", async (AppDbContext db) =>
    await db.Trips.ToListAsync());

app.MapGet("/trips/{id:guid}", async (AppDbContext db, Guid id) =>
{
    var trip = await db.Trips
        .Include(t => t.TravelModes)
        .FirstOrDefaultAsync(t => t.Id == id);

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
        Console.WriteLine("POST /trips hit");
        Console.WriteLine(
            $"TravelModes in request: {(request.TravelModes is null ? "null" : string.Join(",", request.TravelModes))}");

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
            TravelModes = (request.TravelModes ?? new())
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
app.MapPost("/trips/{tripId:guid}/entries", async (AppDbContext db, Guid tripId, CreateEntryRequest req) =>
    {
        var entry = new Entry
        {
            Id = Guid.NewGuid(),
            TripId = tripId,
            EntryDate = req.EntryDate,
            Title = req.Title,
            Content = req.Content,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Entries.Add(entry);
        await db.SaveChangesAsync();

        return Results.Ok(entry);
    }
);

app.Run();