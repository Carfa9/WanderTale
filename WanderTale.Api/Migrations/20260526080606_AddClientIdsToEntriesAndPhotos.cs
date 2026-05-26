using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WanderTale.Migrations
{
    /// <inheritdoc />
    public partial class AddClientIdsToEntriesAndPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Photo_TripId",
                table: "Photo");

            migrationBuilder.DropIndex(
                name: "IX_Entries_TripId",
                table: "Entries");

            migrationBuilder.AddColumn<string>(
                name: "ClientId",
                table: "Photo",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClientId",
                table: "Entries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Photo_TripId_ClientId",
                table: "Photo",
                columns: new[] { "TripId", "ClientId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Entries_TripId_ClientId",
                table: "Entries",
                columns: new[] { "TripId", "ClientId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Photo_TripId_ClientId",
                table: "Photo");

            migrationBuilder.DropIndex(
                name: "IX_Entries_TripId_ClientId",
                table: "Entries");

            migrationBuilder.DropColumn(
                name: "ClientId",
                table: "Photo");

            migrationBuilder.DropColumn(
                name: "ClientId",
                table: "Entries");

            migrationBuilder.CreateIndex(
                name: "IX_Photo_TripId",
                table: "Photo",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_Entries_TripId",
                table: "Entries",
                column: "TripId");
        }
    }
}
