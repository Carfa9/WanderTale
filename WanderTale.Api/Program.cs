using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using WanderTale;
using WanderTale.Endpoints;
using WanderTale.Models;


var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
                       ?? "Data Source=wanderTale.db";

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

var jwtSigningKey = builder.Configuration["Jwt:SigningKey"]
                    ?? throw new InvalidOperationException("Missing Jwt:SigningKey.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "WanderTale",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "WanderTale",
            
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSigningKey))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrWhiteSpace(accessToken) &&
                    path.StartsWithSegments("/photos") &&
                    path.Value?.EndsWith("/image", StringComparison.OrdinalIgnoreCase) == true)
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseSqlite(connectionString)
        .ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning)));

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
        if (allowedOrigins.Length > 0)
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader();
        }
        else if (builder.Environment.IsDevelopment())
        {
            policy
                .WithOrigins("https://example.invalid")
                .AllowAnyMethod()
                .AllowAnyHeader();
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Keeps older SQLite databases from before the sync migrations usable.
    // New schema changes should be made through EF migrations.
    EnsureLegacySyncSchema(db);
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "WanderTale API v1"); });
}

app.MapTripEndpoints();
app.MapStopEndpoints();
app.MapPhotosEndpoints();
app.MapEntriesEndpoints();
app.MapThemesEndpoints();
app.MapAuthEndpoints();

app.Run();

static void EnsureLegacySyncSchema(AppDbContext db)
{
    if (!ColumnExists(db, "Trips", "ClientId"))
    {
        db.Database.ExecuteSqlRaw("""ALTER TABLE "Trips" ADD "ClientId" TEXT NULL;""");
    }

    if (!ColumnExists(db, "Stops", "ClientId"))
    {
        db.Database.ExecuteSqlRaw("""ALTER TABLE "Stops" ADD "ClientId" TEXT NULL;""");
    }

    db.Database.ExecuteSqlRaw("""
        DELETE FROM TripTravelModes
        WHERE rowid NOT IN (
            SELECT MIN(rowid)
            FROM TripTravelModes
            GROUP BY TripId, Mode
        );
        """);

    db.Database.ExecuteSqlRaw("""
        DELETE FROM StopTravelModes
        WHERE rowid NOT IN (
            SELECT MIN(rowid)
            FROM StopTravelModes
            GROUP BY StopId, Mode
        );
        """);

    db.Database.ExecuteSqlRaw("""DROP INDEX IF EXISTS "IX_Trips_ClientId";""");
    db.Database.ExecuteSqlRaw("""DROP INDEX IF EXISTS "IX_Stops_ClientId";""");

    db.Database.ExecuteSqlRaw("""
        UPDATE Trips
        SET UserId = (SELECT Id FROM Users LIMIT 1)
        WHERE UserId = '0'
          AND (SELECT COUNT(*) FROM Users) = 1;
        """);

    db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_Trips_UserId_ClientId" ON "Trips" ("UserId", "ClientId");""");
    db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_Stops_TripId_ClientId" ON "Stops" ("TripId", "ClientId");""");
    db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_TripTravelModes_TripId_Mode" ON "TripTravelModes" ("TripId", "Mode");""");
    db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_StopTravelModes_StopId_Mode" ON "StopTravelModes" ("StopId", "Mode");""");
}

static bool ColumnExists(AppDbContext db, string tableName, string columnName)
{
    var connection = db.Database.GetDbConnection();
    var shouldClose = connection.State == System.Data.ConnectionState.Closed;

    if (shouldClose)
    {
        connection.Open();
    }

    try
    {
        using var command = connection.CreateCommand();
        command.CommandText = $"""PRAGMA table_info("{tableName}")""";

        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            if (string.Equals(reader.GetString(1), columnName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
    finally
    {
        if (shouldClose)
        {
            connection.Close();
        }
    }
}

public partial class Program
{
}
