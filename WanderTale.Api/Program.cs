using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using WanderTale;
using WanderTale.Dto;
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

app.UseStaticFiles();

app.UseSwagger();
app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "WanderTale API v1"); });

app.MapGet("/trips", async (AppDbContext db) =>
    await db.Trips.ToListAsync());



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

app.MapGet("/trips/{tripId:guid}/photos", async (AppDbContext db, Guid tripId) =>
{
    var photos = await db.Photo
        .Where(p => p.TripId == tripId)
        .OrderByDescending(p => p.CreatedAt)
        .Select(p => new
        {
            p.Id,
            p.TripId,
            p.EntryId,
            p.ImageUri,
            p.Caption,
            p.PhotoDate,
            p.Location,
            p.CreatedAt,
            p.UpdatedAt
        }).ToListAsync();

    return Results.Ok(photos);
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
app.MapGet("/trips/{tripId:guid}/entries", async (AppDbContext db, Guid tripId) =>
{
    var entries = await db.Entries
        .Where(e => e.TripId == tripId)
        .OrderByDescending(e => e.EntryDate)
        .Select(e => new { e.Id, e.Title, e.EntryDate, e.Content })
        .ToListAsync();
    return Results.Ok(entries);
});

app.MapDelete("/photos/{photoId:guid}", async (AppDbContext db, Guid photoId, IWebHostEnvironment env) =>
{
    var photo = await db.Photo.FindAsync(photoId);
    if (photo is null) return Results.NotFound();

    var root = string.IsNullOrWhiteSpace(env.WebRootPath)
        ? Path.Combine(env.ContentRootPath, "wwwroot")
        : env.WebRootPath;
    var filePath = Path.Combine(root, photo.ImageUri.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
    if (File.Exists(filePath)) File.Delete(filePath);

    db.Photo.Remove(photo);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPatch("/photos/{photoId:guid}/caption", async (AppDbContext db, Guid photoId, UpdateCaptionRequest req) =>
{
    var photo = await db.Photo.FindAsync(photoId);
    if (photo is null) return Results.NotFound();

    photo.Caption = string.IsNullOrWhiteSpace(req.Caption) ? null : req.Caption.Trim();
    photo.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(new { photo.Id, photo.Caption });
});

app.MapPost("/trips/{tripId:guid}/entries", async (AppDbContext db, Guid tripId, CreateEntryRequest req) =>
    {
        var now = DateTime.UtcNow;
        
        var entry = new Entry
        {
            Id = Guid.NewGuid(),
            TripId = tripId,
            EntryDate = req.EntryDate,
            Title = req.Title,
            Content = req.Content,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Entries.Add(entry);
        await db.SaveChangesAsync();

        return Results.Ok(entry);
    }
);

app.MapPost("/trips/{tripId:guid}/photos", async (AppDbContext db, Guid tripId, HttpRequest req, IWebHostEnvironment env) =>
{
    var form = await req.ReadFormAsync();
    
    var file = form.Files["image"];
    var caption = form["caption"].ToString();
    var photoDateValue = form["photoDate"].ToString();
    var location = form["location"].ToString();
    var entryIdValue = form["entryId"].ToString();
    
    Console.WriteLine($"WebRootPath: {env.WebRootPath}");
    Console.WriteLine($"ContentRootPath: {env.ContentRootPath}");
    Console.WriteLine($"File null? {file is null}");
    Console.WriteLine($"File length: {file?.Length}");
    Console.WriteLine($"File name: {file?.FileName}");
    
    if (file is null || file.Length == 0)
        return Results.BadRequest("Ingen bild skickades");

    Guid? entryId = null;
    if (!string.IsNullOrWhiteSpace(entryIdValue) && Guid.TryParse(entryIdValue, out var parsedEntryId))
    {
        entryId = parsedEntryId;
    }

    DateTime? photoDate = null;
    if (!string.IsNullOrWhiteSpace(photoDateValue) && DateTime.TryParse(photoDateValue, out var parsedPhotoDate))
    {
        photoDate = parsedPhotoDate;
    }
    
    var root = string.IsNullOrWhiteSpace(env.WebRootPath)
        ? Path.Combine(env.ContentRootPath, "wwwroot")
        : env.WebRootPath;
    var uploadsFolder = Path.Combine(root, "uploads");
    Directory.CreateDirectory(uploadsFolder);
    
    var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    var filePath = Path.Combine(uploadsFolder, fileName);
    
    await using (var stream = File.Create(filePath))
    {
        await file.CopyToAsync(stream);
    }
    
    var now = DateTime.UtcNow;
    
    var photo = new Photo
    {
        Id = Guid.NewGuid(),
        TripId = tripId,
        EntryId = entryId,
        ImageUri = $"/uploads/{fileName}",
        Caption = string.IsNullOrWhiteSpace(caption) ? null : caption,
        PhotoDate = photoDate,
        Location = string.IsNullOrWhiteSpace(location) ? null : location.Trim(),
        CreatedAt = now,
        UpdatedAt = now
    };

    db.Photo.Add(photo);
    await db.SaveChangesAsync();
    
    return Results.Ok(photo);

});

app.MapPost("/dev/save-theme", async (HttpRequest req, IWebHostEnvironment env) =>
{
    var content = await new StreamReader(req.Body).ReadToEndAsync();
    var themePath = Path.GetFullPath(
        Path.Combine(env.ContentRootPath, "..", "WanderTale.Web", "constants", "theme.ts")
    );
    await File.WriteAllTextAsync(themePath, content);
    return Results.Ok(new { path = themePath });
});

app.Run();
