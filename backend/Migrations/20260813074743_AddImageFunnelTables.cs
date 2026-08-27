using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MenuOcrEngine.Migrations
{
    /// <inheritdoc />
    public partial class AddImageFunnelTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_settings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_settings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "food_item_names",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NameRaw = table.Column<string>(type: "text", nullable: false),
                    NameNormalized = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_food_item_names", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "phase1_images",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_phase1_images", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "phase2_images",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RootWord = table.Column<string>(type: "text", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    FrequencyCount = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_phase2_images", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "phase3_images",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    StoragePath = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_phase3_images", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "unmatched_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    NameNormalized = table.Column<string>(type: "text", nullable: false),
                    LoggedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    PhaseResolved = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unmatched_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "phase1_category_keywords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    phase1_image_id = table.Column<int>(type: "integer", nullable: false),
                    Keyword = table.Column<string>(type: "text", nullable: false),
                    Tier = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_phase1_category_keywords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_phase1_category_keywords_phase1_images_phase1_image_id",
                        column: x => x.phase1_image_id,
                        principalTable: "phase1_images",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "root_word_synonyms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Synonym = table.Column<string>(type: "text", nullable: false),
                    phase2_image_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_root_word_synonyms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_root_word_synonyms_phase2_images_phase2_image_id",
                        column: x => x.phase2_image_id,
                        principalTable: "phase2_images",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "phase3_aliases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    phase3_image_id = table.Column<Guid>(type: "uuid", nullable: false),
                    AliasRaw = table.Column<string>(type: "text", nullable: false),
                    AliasNormalized = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_phase3_aliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_phase3_aliases_phase3_images_phase3_image_id",
                        column: x => x.phase3_image_id,
                        principalTable: "phase3_images",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_food_item_names_NameNormalized",
                table: "food_item_names",
                column: "NameNormalized");

            migrationBuilder.CreateIndex(
                name: "IX_phase1_category_keywords_Keyword",
                table: "phase1_category_keywords",
                column: "Keyword");

            migrationBuilder.CreateIndex(
                name: "IX_phase1_category_keywords_phase1_image_id",
                table: "phase1_category_keywords",
                column: "phase1_image_id");

            migrationBuilder.CreateIndex(
                name: "IX_phase1_images_Slug",
                table: "phase1_images",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_phase2_images_RootWord",
                table: "phase2_images",
                column: "RootWord",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_phase3_aliases_AliasNormalized",
                table: "phase3_aliases",
                column: "AliasNormalized",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_phase3_aliases_phase3_image_id",
                table: "phase3_aliases",
                column: "phase3_image_id");

            migrationBuilder.CreateIndex(
                name: "IX_phase3_images_Slug",
                table: "phase3_images",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_root_word_synonyms_phase2_image_id",
                table: "root_word_synonyms",
                column: "phase2_image_id");

            migrationBuilder.CreateIndex(
                name: "IX_root_word_synonyms_Synonym",
                table: "root_word_synonyms",
                column: "Synonym",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_settings");

            migrationBuilder.DropTable(
                name: "food_item_names");

            migrationBuilder.DropTable(
                name: "phase1_category_keywords");

            migrationBuilder.DropTable(
                name: "phase3_aliases");

            migrationBuilder.DropTable(
                name: "root_word_synonyms");

            migrationBuilder.DropTable(
                name: "unmatched_logs");

            migrationBuilder.DropTable(
                name: "phase1_images");

            migrationBuilder.DropTable(
                name: "phase3_images");

            migrationBuilder.DropTable(
                name: "phase2_images");
        }
    }
}
