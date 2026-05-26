using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WanderTale.Dto;
using WanderTale.Models;

namespace WanderTale.Endpoints;

public static class PhotosEndpoints
{
    public static void MapPhotosEndpoints(this WebApplication app)
    {
        app.MapGet("/trips/{tripId:guid}/photos", async (AppDbContext db, Guid tripId, ClaimsPrincipal user) =>
        {
            var userId = EndpointAuth.GetUserId(user);
            if (userId is null) return Results.Unauthorized();
            if (!await EndpointAuth.OwnsTripAsync(db, tripId, userId.Value)) return Results.NotFound();

            var photos = await db.Photo
                .Where(p => p.TripId == tripId)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.TripId,
                    p.EntryId,
                    p.ClientId,
                    ImageUri = ProtectedPhotoUri(p.Id),
                    p.Caption,
                    p.PhotoDate,
                    p.Location,
                    p.CreatedAt,
                    p.UpdatedAt
                }).ToListAsync();

            return Results.Ok(photos);
        }).RequireAuthorization();

        app.MapGet("/photos/{photoId:guid}/image",
            async (AppDbContext db, Guid photoId, IWebHostEnvironment env, ClaimsPrincipal user) =>
            {
                var userId = EndpointAuth.GetUserId(user);
                if (userId is null) return Results.Unauthorized();

                var photo = await db.Photo
                    .Include(p => p.Trip)
                    .FirstOrDefaultAsync(p => p.Id == photoId && p.Trip.UserId == userId.Value);
                if (photo is null) return Results.NotFound();

                var filePath = ResolveStoredPhotoPath(env, photo.ImageUri);
                if (!File.Exists(filePath)) return Results.NotFound();

                return Results.File(filePath, GetImageContentType(filePath));
            }).RequireAuthorization();

        app.MapDelete("/photos/{photoId:guid}",
            async (AppDbContext db, Guid photoId, IWebHostEnvironment env, ClaimsPrincipal user) =>
            {
                var userId = EndpointAuth.GetUserId(user);
                if (userId is null) return Results.Unauthorized();

                var photo = await db.Photo
                    .Include(p => p.Trip)
                    .FirstOrDefaultAsync(p => p.Id == photoId && p.Trip.UserId == userId.Value);
                if (photo is null) return Results.NotFound();

                var filePath = ResolveStoredPhotoPath(env, photo.ImageUri);
                if (File.Exists(filePath)) File.Delete(filePath);

                db.Photo.Remove(photo);
                await db.SaveChangesAsync();
                return Results.NoContent();
            }).RequireAuthorization();

        app.MapPatch("/photos/{photoId:guid}/caption",
            async (AppDbContext db, Guid photoId, UpdateCaptionRequest req, ClaimsPrincipal user) =>
            {
                var userId = EndpointAuth.GetUserId(user);
                if (userId is null) return Results.Unauthorized();

                var photo = await db.Photo
                    .Include(p => p.Trip)
                    .FirstOrDefaultAsync(p => p.Id == photoId && p.Trip.UserId == userId.Value);
                if (photo is null) return Results.NotFound();

                photo.Caption = string.IsNullOrWhiteSpace(req.Caption) ? null : req.Caption.Trim();
                photo.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
                return Results.Ok(new { photo.Id, photo.Caption });
            }).RequireAuthorization();

        app.MapPost("/trips/{tripId:guid}/photos",
            async (AppDbContext db, Guid tripId, HttpRequest req, IWebHostEnvironment env, ClaimsPrincipal user) =>
            {
                var userId = EndpointAuth.GetUserId(user);
                if (userId is null) return Results.Unauthorized();
                if (!await EndpointAuth.OwnsTripAsync(db, tripId, userId.Value)) return Results.NotFound();

                var form = await req.ReadFormAsync();

                var file = form.Files["image"];
                var caption = form["caption"].ToString();
                var photoDateValue = form["photoDate"].ToString();
                var location = form["location"].ToString();
                var entryIdValue = form["entryId"].ToString();
                var clientId = form["clientId"].ToString();
                
                if (!string.IsNullOrWhiteSpace(clientId))
                {
                    var existingPhoto = await db.Photo
                        .FirstOrDefaultAsync(p =>
                            p.TripId == tripId &&
                            p.ClientId == clientId);

                    if (existingPhoto is not null)
                    {
                        return Results.Ok(new
                        {
                            existingPhoto.Id,
                            existingPhoto.ClientId,
                            existingPhoto.TripId,
                            existingPhoto.EntryId,
                            ImageUri = ProtectedPhotoUri(existingPhoto.Id),
                            existingPhoto.Caption,
                            existingPhoto.PhotoDate,
                            existingPhoto.Location,
                            existingPhoto.CreatedAt,
                            existingPhoto.UpdatedAt
                        });
                    }
                }

                if (file is null || file.Length == 0)
                    return Results.BadRequest("Ingen bild skickades");

                const long maxFileSize = 5 * 1024 * 1024;

                if (file.Length > maxFileSize)
                    return Results.BadRequest("Bilden får max vara 5 MB");

                var allowedContentTypes = new[] { "image/jpeg", "image/png" };

                if (!allowedContentTypes.Contains(file.ContentType))
                    return Results.BadRequest("Endast JPG och PNG stöds");

                Guid? entryId = null;
                if (!string.IsNullOrWhiteSpace(entryIdValue))
                {
                    if (!Guid.TryParse(entryIdValue, out var parsedEntryId))
                        return Results.BadRequest("Invalid entryId.");

                    var entryBelongsToTrip = await db.Entries
                        .AnyAsync(e => e.Id == parsedEntryId && e.TripId == tripId);
                    if (!entryBelongsToTrip) return Results.BadRequest("Entry does not belong to this trip.");

                    entryId = parsedEntryId;
                }

                DateTime? photoDate = null;
                if (!string.IsNullOrWhiteSpace(photoDateValue) &&
                    DateTime.TryParse(photoDateValue, out var parsedPhotoDate))
                {
                    photoDate = parsedPhotoDate;
                }

                var uploadsFolder = Path.Combine(GetPrivateUploadsRoot(env), "trips", tripId.ToString());
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
                    ClientId = string.IsNullOrWhiteSpace(clientId) ? null : clientId,
                    ImageUri = $"trips/{tripId}/{fileName}",
                    Caption = string.IsNullOrWhiteSpace(caption) ? null : caption,
                    PhotoDate = photoDate,
                    Location = string.IsNullOrWhiteSpace(location) ? null : location.Trim(),
                    CreatedAt = now,
                    UpdatedAt = now
                };

                db.Photo.Add(photo);
                await db.SaveChangesAsync();

                return Results.Ok(new
                {
                    photo.Id,
                    photo.TripId,
                    photo.EntryId,
                    photo.ClientId,
                    ImageUri = ProtectedPhotoUri(photo.Id),
                    photo.Caption,
                    photo.PhotoDate,
                    photo.Location,
                    photo.CreatedAt,
                    photo.UpdatedAt
                });
            }).RequireAuthorization();
    }

    private static string ProtectedPhotoUri(Guid photoId) => $"/photos/{photoId}/image";

    internal static string ResolveStoredPhotoPath(IWebHostEnvironment env, string imageUri)
    {
        var normalized = imageUri.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);

        if (imageUri.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            var publicRoot = string.IsNullOrWhiteSpace(env.WebRootPath)
                ? Path.Combine(env.ContentRootPath, "wwwroot")
                : env.WebRootPath;

            return CombineInsideRoot(publicRoot, normalized);
        }

        return CombineInsideRoot(GetPrivateUploadsRoot(env), normalized);
    }

    private static string GetPrivateUploadsRoot(IWebHostEnvironment env)
    {
        return Path.Combine(env.ContentRootPath, "private-uploads");
    }

    private static string GetImageContentType(string filePath)
    {
        return Path.GetExtension(filePath).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
    }

    private static string CombineInsideRoot(string root, string relativePath)
    {
        var fullRoot = Path.GetFullPath(root);
        var fullPath = Path.GetFullPath(Path.Combine(fullRoot, relativePath));
        var rootWithSeparator = fullRoot.EndsWith(Path.DirectorySeparatorChar)
            ? fullRoot
            : fullRoot + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid photo path.");
        }

        return fullPath;
    }
}
