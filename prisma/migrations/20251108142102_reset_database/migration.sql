-- CreateTable
CREATE TABLE "Pokemon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TeamSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slotNumber" INTEGER NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    CONSTRAINT "TeamSlot_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "starterChosen" BOOLEAN NOT NULL DEFAULT false,
    "starterPokemon" TEXT,
    "lastPlayed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Pokemon_uuid_key" ON "Pokemon"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSlot_slotNumber_key" ON "TeamSlot"("slotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSlot_pokemonId_key" ON "TeamSlot"("pokemonId");

-- CreateIndex
CREATE INDEX "TeamSlot_slotNumber_idx" ON "TeamSlot"("slotNumber");
