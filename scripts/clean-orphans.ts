import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB.');

    // 1. Obtener todos los IDs válidos de usuarios
    const usersCollection = mongoose.connection.collection('users');
    const users = await usersCollection.find({}, { projection: { _id: 1 } }).toArray();
    const userIds = users.map(u => u._id);
    console.log(`Encontrados ${userIds.length} usuarios válidos en la base de datos.`);

    // 2. Obtener todos los IDs válidos de organizaciones
    const orgsCollection = mongoose.connection.collection('organizations');
    const orgs = await orgsCollection.find({}, { projection: { _id: 1 } }).toArray();
    const orgIds = orgs.map(o => o._id);
    console.log(`Encontradas ${orgIds.length} organizaciones válidas en la base de datos.`);

    // 3. Eliminar membresías huérfanas (cuyo user_id o organization_id ya no existan)
    const membershipsCollection = mongoose.connection.collection('memberships');
    
    // Antes de borrar, contemos cuántas membresías totales hay
    const totalMembershipsBefore = await membershipsCollection.countDocuments();
    console.log(`Total de membresías registradas actualmente: ${totalMembershipsBefore}`);

    const result = await membershipsCollection.deleteMany({
      $or: [
        { user_id: { $nin: userIds } },
        { organization_id: { $nin: orgIds } }
      ]
    });

    const totalMembershipsAfter = await membershipsCollection.countDocuments();
    console.log(`--------------------------------------------------`);
    console.log(`🧹 LIMPIEZA COMPLETADA:`);
    console.log(`Membresías huérfanas eliminadas: ${result.deletedCount}`);
    console.log(`Membresías válidas restantes: ${totalMembershipsAfter}`);
    console.log(`--------------------------------------------------`);

  } catch (error) {
    console.error('Error durante la limpieza de huérfanos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main();
