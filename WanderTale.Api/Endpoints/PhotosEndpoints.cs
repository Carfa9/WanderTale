using Microsoft.EntityFrameworkCore;
using WanderTale.Dto;
using WanderTale.Models;

namespace WanderTale.Endpoints;

public static class PhotosEndpoints
{
    public static void MapPhotosEndpoints(this WebApplication app)
    {
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

        app.MapPatch("/photos/{photoId:guid}/caption",
            async (AppDbContext db, Guid photoId, UpdateCaptionRequest req) =>
            {
                var photo = await db.Photo.FindAsync(photoId);
                if (photo is null) return Results.NotFound();

                photo.Caption = string.IsNullOrWhiteSpace(req.Caption) ? null : req.Caption.Trim();
                photo.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                return Results.Ok(new { photo.Id, photo.Caption });
            });

        app.MapPost("/trips/{tripId:guid}/photos",
            async (AppDbContext db, Guid tripId, HttpRequest req, IWebHostEnvironment env) =>
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
                if (!string.IsNullOrWhiteSpace(photoDateValue) &&
                    DateTime.TryParse(photoDateValue, out var parsedPhotoDate))
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
    }
}