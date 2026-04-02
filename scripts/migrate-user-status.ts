/**
 * Script de migración: Marca todos los usuarios existentes (con password_hash)
 * como status: 'active'. Los usuarios sin password_hash se marcan como 'pending'.
 * 
 * Ejecutar: npx tsx scripts/migrate-user-status.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function migrate() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI no configurada');
    process.exit(1);
  }

  console.log('Conectando a MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Conectado.');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('No se pudo obtener la conexión a la base de datos');
    process.exit(1);
  }

  const usersCollection = db.collection('users');

  // Marcar usuarios con password_hash como 'active'
  const activeResult = await usersCollection.updateMany(
    { password_hash: { $exists: true, $nin: [null, ''] }, status: { $exists: false } },
    { $set: { status: 'active' } }
  );
  console.log(`✅ ${activeResult.modifiedCount} usuarios marcados como 'active'`);

  // Marcar usuarios sin password_hash como 'pending'
  const pendingResult = await usersCollection.updateMany(
    { $or: [{ password_hash: { $exists: false } }, { password_hash: null }, { password_hash: '' }], status: { $exists: false } },
    { $set: { status: 'pending' } }
  );
  console.log(`⏳ ${pendingResult.modifiedCount} usuarios marcados como 'pending'`);

  // Resumen
  const totalActive = await usersCollection.countDocuments({ status: 'active' });
  const totalPending = await usersCollection.countDocuments({ status: 'pending' });
  console.log(`\n📊 Resumen: ${totalActive} activos, ${totalPending} pendientes`);

  await mongoose.disconnect();
  console.log('Desconectado. Migración completada.');
}

migrate().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
