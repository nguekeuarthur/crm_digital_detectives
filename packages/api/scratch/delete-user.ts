import { prisma } from '../src/shared/prisma';

async function deleteUserHard() {
  const email = 'edimaevina@gmail.com';
  console.log(`🧹 Suppression de l'utilisateur ${email} et de ses dépendances...`);

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('⚠️ Utilisateur non trouvé.');
      return;
    }

    // Supprimer les dépendances avec les bons noms de modèles Prisma
    await prisma.activity.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.mandatSubcontractor.deleteMany({ where: { subcontractorId: user.id } });
    await prisma.timeEntry.deleteMany({ where: { subcontractorId: user.id } });

    // Enfin supprimer l'utilisateur
    await prisma.user.delete({ where: { id: user.id } });
    
    console.log(`✅ Utilisateur ${email} supprimé avec succès.`);
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression hard :', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUserHard();
