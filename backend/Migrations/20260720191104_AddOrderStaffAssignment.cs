using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenuOcrEngine.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderStaffAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AssignedChefName",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssignedWaiterName",
                table: "Orders",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedChefName",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "AssignedWaiterName",
                table: "Orders");
        }
    }
}
