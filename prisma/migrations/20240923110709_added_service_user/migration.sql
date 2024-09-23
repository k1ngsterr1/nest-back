-- CreateTable
CREATE TABLE "ServiceUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "planId" TEXT NOT NULL,
    "traffic" INTEGER NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "serviceType" TEXT NOT NULL,
    "region" TEXT,
    "ipNumber" TEXT,

    CONSTRAINT "ServiceUser_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceUser" ADD CONSTRAINT "ServiceUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
