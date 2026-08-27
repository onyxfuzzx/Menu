using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenuOcrEngine.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderAssignedWaiterId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AssignedWaiterId",
                table: "Orders",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedWaiterId",
                table: "Orders");
        }
    }
}
