-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PostJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'post',
    "subject" TEXT,
    "desc" TEXT NOT NULL,
    "dmMessage" TEXT,
    "targetUsers" TEXT,
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
INSERT INTO "new_PostJob" ("createdAt", "desc", "id", "loginId", "loginPw", "postedAt", "resultMsg", "resultUrl", "scheduledAt", "status", "subject", "updatedAt") SELECT "createdAt", "desc", "id", "loginId", "loginPw", "postedAt", "resultMsg", "resultUrl", "scheduledAt", "status", "subject", "updatedAt" FROM "PostJob";
DROP TABLE "PostJob";
ALTER TABLE "new_PostJob" RENAME TO "PostJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
