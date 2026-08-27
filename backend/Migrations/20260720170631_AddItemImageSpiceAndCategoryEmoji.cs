using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MenuOcrEngine.Migrations
{
    /// <inheritdoc />
    public partial class AddItemImageSpiceAndCategoryEmoji : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "MenuItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SpiceLevel",
                table: "MenuItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Emoji",
                table: "MenuCategories",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "MenuItems");

            migrationBuilder.DropColumn(
                name: "SpiceLevel",
                table: "MenuItems");

            migrationBuilder.DropColumn(
                name: "Emoji",
                table: "MenuCategories");
        }
    }
}
