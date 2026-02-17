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
}