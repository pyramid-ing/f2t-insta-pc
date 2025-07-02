/*
  Warnings:

  - The primary key for the `PostJob` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Log_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PostJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Log" ("createdAt", "id", "jobId", "message", "updatedAt") SELECT "createdAt", "id", "jobId", "message", "updatedAt" FROM "Log";
DROP TABLE "Log";
ALTER TABLE "new_Log" RENAME TO "Log";
CREATE INDEX "Log_jobId_idx" ON "Log"("jobId");
CREATE TABLE "new_PostJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT,
    "desc" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "loginPw" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resultMsg" TEXT,
    "resultUrl" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "postedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PostJob" ("createdAt", "desc", "id", "loginId", "loginPw", "postedAt", "resultMsg", "scheduledAt", "status", "subject", "updatedAt") SELECT "createdAt", "desc", "id", "loginId", "loginPw", "postedAt", "resultMsg", "scheduledAt", "status", "subject", "updatedAt" FROM "PostJob";
DROP TABLE "PostJob";
ALTER TABLE "new_PostJob" RENAME TO "PostJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
