using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using WanderTale;

#nullable disable

namespace WanderTale.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260520162000_AddClientIdsAndUniqueTravelModes")]
    public partial class AddClientIdsAndUniqueTravelModes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientId",
                table: "Trips",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClientId",
                table: "Stops",
                type: "TEXT",
                nullable: true);

            migrationBuilder.Sql("""
                DELETE FROM TripTravelModes
                WHERE rowid NOT IN (
                    SELECT MIN(rowid)
                    FROM TripTravelModes
                    GROUP BY TripId, Mode
                );
                """);

            migrationBuilder.Sql("""
                DELETE FROM StopTravelModes
                WHERE rowid NOT IN (
                    SELECT MIN(rowid)
                    FROM StopTravelModes
                    GROUP BY StopId, Mode
                );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Trips_ClientId",
                table: "Trips",
                column: "ClientId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Stops_ClientId",
                table: "Stops",
                column: "ClientId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TripTravelModes_TripId_Mode",
                table: "TripTravelModes",
                columns: new[] { "TripId", "Mode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StopTravelModes_StopId_Mode",
                table: "StopTravelModes",
                columns: new[] { "StopId", "Mode" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Trips_ClientId",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Stops_ClientId",
                table: "Stops");

            migrationBuilder.DropIndex(
                name: "IX_TripTravelModes_TripId_Mode",
                table: "TripTravelModes");

            migrationBuilder.DropIndex(
                name: "IX_StopTravelModes_StopId_Mode",
                table: "StopTravelModes");

            migrationBuilder.DropColumn(
                name: "ClientId",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "ClientId",
                table: "Stops");
        }
    }
}
