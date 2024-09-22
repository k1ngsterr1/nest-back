-- CreateTable
CREATE TABLE "DepositPayments" (
    "id" SERIAL NOT NULL,
    "payment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "username" TEXT NOT NULL,
    "payment_type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositPayments_pkey" PRIMARY KEY ("id")
);
