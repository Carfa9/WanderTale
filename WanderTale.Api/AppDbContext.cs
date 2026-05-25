using Microsoft.EntityFrameworkCore;
using WanderTale.Models;

namespace WanderTale;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
        
    }
    
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripTravelMode> TripTravelModes => Set<TripTravelMode>();
    public DbSet<Entry> Entries => Set<Entry>();
    public DbSet<Photo> Photo => Set<Photo>();
    public DbSet<Stop> Stops => Set<Stop>();
    public DbSet<StopTravelMode> StopTravelModes => Set<StopTravelMode>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Trip>()
            .HasIndex(t => new { t.UserId, t.ClientId })
            .IsUnique();

        modelBuilder.Entity<Stop>()
            .HasIndex(s => new { s.TripId, s.ClientId })
            .IsUnique();

        modelBuilder.Entity<TripTravelMode>()
            .HasIndex(tm => new { tm.TripId, tm.Mode })
            .IsUnique();

        modelBuilder.Entity<StopTravelMode>()
            .HasIndex(sm => new { sm.StopId, sm.Mode })
            .IsUnique();
        
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(t => t.TokenHash)
            .IsUnique();
    }
}
