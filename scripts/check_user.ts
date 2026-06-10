import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { User } from "../models/User";

loadEnvConfig(process.cwd());

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");
  
  const users = await User.find({ $or: [{ _id: "OUT99" }, { nfc_card_id: "OUT99" }, { email: "out@test.com" }] });
  console.log("Found users matching criteria:");
  console.log(JSON.stringify(users, null, 2));
  
  await mongoose.disconnect();
}

main().catch(console.error);
