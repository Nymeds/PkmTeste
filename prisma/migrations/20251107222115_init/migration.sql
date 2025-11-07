/*
  Warnings:

  - You are about to drop the `Encounter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameState` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `lastSeen` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `positionX` on the `Pokemon` table. All the data in the column will be lost.
  - You are about to drop the column `positionY` on the `Pokemon` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Encounter";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GameState";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TeamSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slot" INTEGER NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    CONSTRAINT "TeamSlot_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pokemon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Pokemon" ("attack", "createdAt", "defense", "hp", "id", "isActive", "isStarter", "level", "maxHp", "name", "speed", "xp") SELECT "attack", "createdAt", "defense", "hp", "id", "isActive", "isStarter", "level", "maxHp", "name", "speed", "xp" FROM "Pokemon";
DROP TABLE "Pokemon";
ALTER TABLE "new_Pokemon" RENAME TO "Pokemon";
CREATE UNIQUE INDEX "Pokemon_name_key" ON "Pokemon"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
