-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pokemonId" TEXT NOT NULL,
    "nickname" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "currentHp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "positionX" REAL NOT NULL DEFAULT 0,
    "positionY" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastXpGain" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GameState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
    "hasChosenStarter" BOOLEAN NOT NULL DEFAULT false,
    "starterPetId" TEXT,
    "totalPlayTime" INTEGER NOT NULL DEFAULT 0,
    "lastPlayed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId1" TEXT NOT NULL,
    "petId2" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "xpGained" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Pet_isActive_idx" ON "Pet"("isActive");

-- CreateIndex
CREATE INDEX "Pet_pokemonId_idx" ON "Pet"("pokemonId");

-- CreateIndex
CREATE UNIQUE INDEX "GameState_id_key" ON "GameState"("id");

-- CreateIndex
CREATE INDEX "Encounter_petId1_idx" ON "Encounter"("petId1");

-- CreateIndex
CREATE INDEX "Encounter_timestamp_idx" ON "Encounter"("timestamp");
