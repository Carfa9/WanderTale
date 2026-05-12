using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WanderTale.Migrations
{
    /// <inheritdoc />
    public partial class AddStops : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Leg");

            migrationBuilder.CreateTable(
                name: "Stops",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TripId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Country = table.Column<string>(type: "TEXT", nullable: true),
                    OrderIndex = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stops", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Stops_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StopTravelModes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    StopId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Mode = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StopTravelModes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StopTravelModes_Stops_StopId",
                        column: x => x.StopId,
                        principalTable: "Stops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Stops_TripId",
                table: "Stops",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_StopTravelModes_StopId",
                table: "StopTravelModes",
                column: "StopId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StopTravelModes");

            migrationBuilder.DropTable(
                name: "Stops");

            migrationBuilder.CreateTable(
                name: "Leg",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    DueDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsCompleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    TripId = table.Column<Guid>(type: "TEXT", nullable: false),
                    tripModeId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leg", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Leg_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Leg_TripId",
                table: "Leg",
                column: "TripId");
        }
    }
}
