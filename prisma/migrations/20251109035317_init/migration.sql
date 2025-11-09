/*
  Warnings:

  - You are about to drop the `Pokemon` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Pokemon";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TeamPokemon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_TeamPokemon" ("attack", "createdAt", "defense", "hp", "id", "level", "maxHp", "name", "speed", "uuid", "xp") SELECT "attack", "createdAt", "defense", "hp", "id", "level", "maxHp", "name", "speed", "uuid", "xp" FROM "TeamPokemon";
DROP TABLE "TeamPokemon";
ALTER TABLE "new_TeamPokemon" RENAME TO "TeamPokemon";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
