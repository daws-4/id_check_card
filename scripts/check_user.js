const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^MONGODB_URI=(.+)$/m);
if (!match) {
  console.error("MONGODB_URI not found in .env");
  process.exit(1);
}
const mongoUri = match[1].trim();

async function main() {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully!");

  const UserSchema = new mongoose.Schema({}, { strict: false, collection: "users" });
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  // Query safely by nfc_card_id and email (without _id)
  const usersByNfc = await User.find({ nfc_card_id: "OUT99" });
  console.log("Users found by nfc_card_id = OUT99:");
  console.log(JSON.stringify(usersByNfc, null, 2));

  const usersByEmail = await User.find({ email: "out@test.com" });
  console.log("Users found by email = out@test.com:");
  console.log(JSON.stringify(usersByEmail, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
