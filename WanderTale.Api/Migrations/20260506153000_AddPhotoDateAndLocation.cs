using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WanderTale.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoDateAndLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Photo",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PhotoDate",
                table: "Photo",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Location",
                table: "Photo");

            migrationBuilder.DropColumn(
                name: "PhotoDate",
                table: "Photo");
        }
    }
}
