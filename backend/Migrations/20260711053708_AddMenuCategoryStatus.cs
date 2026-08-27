using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenuOcrEngine.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuCategoryStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "MenuCategories",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Uploaded");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "MenuCategories");
        }
    }
}
