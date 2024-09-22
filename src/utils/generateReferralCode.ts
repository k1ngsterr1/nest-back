import { PrismaService } from 'src/prisma.service'; // Make sure to import your PrismaService

export const generateUniqueReferralCode = async (prisma: PrismaService) => {
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const existingCodeCount = await prisma.user.count({
      where: { refCode: code },
    });

    if (existingCodeCount === 0) {
      isUnique = true;
    }
  }

  return code;
};
