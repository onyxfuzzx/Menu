CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE TABLE "MenuPages" (
        "Id" uuid NOT NULL,
        "PageNumber" integer NOT NULL,
        "Status" character varying(50) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL DEFAULT (NOW()),
        "UpdatedAt" timestamp with time zone NOT NULL DEFAULT (NOW()),
        CONSTRAINT "PK_MenuPages" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE TABLE "ValidationLogs" (
        "Id" uuid NOT NULL,
        "CategoryName" character varying(500) NOT NULL,
        "RawJson" text NOT NULL,
        "IsValid" boolean NOT NULL,
        "ErrorsJson" text,
        "CorrectionRound" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL DEFAULT (NOW()),
        CONSTRAINT "PK_ValidationLogs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE TABLE "MenuCategories" (
        "Id" uuid NOT NULL,
        "MenuPageId" uuid NOT NULL,
        "CategoryName" character varying(500) NOT NULL,
        "Notes" text,
        "SortOrder" integer NOT NULL,
        "RawOcrJson" text,
        CONSTRAINT "PK_MenuCategories" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_MenuCategories_MenuPages_MenuPageId" FOREIGN KEY ("MenuPageId") REFERENCES "MenuPages" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE TABLE "MenuSubCategories" (
        "Id" uuid NOT NULL,
        "MenuCategoryId" uuid NOT NULL,
        "SubCategoryName" character varying(500) NOT NULL,
        "SortOrder" integer NOT NULL,
        CONSTRAINT "PK_MenuSubCategories" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_MenuSubCategories_MenuCategories_MenuCategoryId" FOREIGN KEY ("MenuCategoryId") REFERENCES "MenuCategories" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE TABLE "MenuItems" (
        "Id" uuid NOT NULL,
        "MenuCategoryId" uuid,
        "MenuSubCategoryId" uuid,
        "Name" character varying(1000) NOT NULL,
        "Description" character varying(2000),
        "Notes" text,
        "Badges" text NOT NULL,
        "SortOrder" integer NOT NULL,
        CONSTRAINT "PK_MenuItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_MenuItems_MenuCategories_MenuCategoryId" FOREIGN KEY ("MenuCategoryId") REFERENCES "MenuCategories" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_MenuItems_MenuSubCategories_MenuSubCategoryId" FOREIGN KEY ("MenuSubCategoryId") REFERENCES "MenuSubCategories" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE TABLE "MenuItemPrices" (
        "Id" uuid NOT NULL,
        "MenuItemId" uuid NOT NULL,
        "Label" character varying(500),
        "Value" numeric(10,2) NOT NULL,
        "OriginalPrice" numeric(10,2),
        "SortOrder" integer NOT NULL,
        CONSTRAINT "PK_MenuItemPrices" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_MenuItemPrices_MenuItems_MenuItemId" FOREIGN KEY ("MenuItemId") REFERENCES "MenuItems" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE INDEX "IX_MenuCategories_MenuPageId" ON "MenuCategories" ("MenuPageId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE INDEX "IX_MenuItemPrices_MenuItemId" ON "MenuItemPrices" ("MenuItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE INDEX "IX_MenuItems_MenuCategoryId" ON "MenuItems" ("MenuCategoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE INDEX "IX_MenuItems_MenuSubCategoryId" ON "MenuItems" ("MenuSubCategoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    CREATE INDEX "IX_MenuSubCategories_MenuCategoryId" ON "MenuSubCategories" ("MenuCategoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260701165612_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260701165612_InitialCreate', '8.0.10');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260703071457_AddUuidDefaultsAndSubCategoryNotes') THEN
    ALTER TABLE "MenuSubCategories" ADD "Notes" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260703071457_AddUuidDefaultsAndSubCategoryNotes') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260703071457_AddUuidDefaultsAndSubCategoryNotes', '8.0.10');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260711053708_AddMenuCategoryStatus') THEN
    ALTER TABLE "MenuCategories" ADD "Status" character varying(50) NOT NULL DEFAULT 'Uploaded';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260711053708_AddMenuCategoryStatus') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260711053708_AddMenuCategoryStatus', '8.0.10');
    END IF;
END $EF$;
COMMIT;

