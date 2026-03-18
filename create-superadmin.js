const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Connect to DB directly
const MONGODB_URI = "mongodb+srv://villamizarandresdavid:Shoko.180506@businfotachira.nn3l8.mongodb.net/id_check_card?retryWrites=true&w=majority&appName=businfotachira";

async function createSuperAdmin() {
  try {
    console.log("Conectando a MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Conectado exitosamente.");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    const email = "villamizarandresdavid@gmail.com";
    const password = "Shoko.180506";

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      console.log(`El usuario con el email ${email} ya existe. Borrándolo/sobreescribiéndolo...`);
      await usersCollection.deleteOne({ email });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      name: "Andres Villamizar",
      email,
      password_hash,
      nfc_card_id: "SUPER_ADMIN_NFC_001",
      role: "superadmin",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    console.log(`¡Superusuario insertado directamente en la base de datos! (ID: ${result.insertedId})`);

  } catch (err) {
    console.error("Error creando el super admin:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Conexión a base de datos cerrada.");
  }
}

createSuperAdmin();
