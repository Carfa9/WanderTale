using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WanderTale.Migrations
{
    /// <inheritdoc />
    public partial class ScopeClientIdsByOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Trips_ClientId",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Stops_ClientId",
                table: "Stops");

            migrationBuilder.DropIndex(
                name: "IX_Stops_TripId",
                table: "Stops");

            migrationBuilder.CreateIndex(
                name: "IX_Trips_UserId_ClientId",
                table: "Trips",
                columns: new[] { "UserId", "ClientId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Stops_TripId_ClientId",
                table: "Stops",
                columns: new[] { "TripId", "ClientId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Trips_UserId_ClientId",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Stops_TripId_ClientId",
                table: "Stops");

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
                name: "IX_Stops_TripId",
                table: "Stops",
                column: "TripId");
        }
    }
}
