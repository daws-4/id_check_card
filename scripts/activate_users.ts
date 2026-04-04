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
    console.log('Connnecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB.');

    // Use raw model without importing
    const collection = mongoose.connection.collection('users');

    console.log('Updating pending users to active...');
    const result = await collection.updateMany(
      { $or: [{ status: 'pending' }, { status: { $exists: false } }] },
      { $set: { status: 'active' }, $unset: { invite_token: "", invite_token_expires: "" } }
    );
    
    console.log(`Successfully updated ${result.modifiedCount} user(s).`);

  } catch (error) {
    console.error('Error during update:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main();
