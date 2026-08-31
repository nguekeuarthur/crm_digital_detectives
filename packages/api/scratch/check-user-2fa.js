import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function fixUser() {
  // 1. Vérifier l'état actuel
  const before = await prisma.user.findUnique({
    where: { email: 'edimaevina@gmail.com' },
    select: { id: true, email: true, isTwoFactorEnabled: true, twoFactorSecret: true }
  })
  console.log('AVANT:', JSON.stringify(before, null, 2))

  // 2. Forcer la désactivation
  if (before) {
    await prisma.user.update({
      where: { id: before.id },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null }
    })
  }

  // 3. Vérifier le résultat
  const after = await prisma.user.findUnique({
    where: { email: 'edimaevina@gmail.com' },
    select: { id: true, email: true, isTwoFactorEnabled: true, twoFactorSecret: true }
  })
  console.log('APRÈS:', JSON.stringify(after, null, 2))

  await prisma.$disconnect()
}

fixUser()
