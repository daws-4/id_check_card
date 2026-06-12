import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

loadEnvConfig(process.cwd());

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected to MongoDB.");

    const email = "villamizarandresdavid@gmail.com";
    const password = "codeBass/14";

    console.log("Hashing password...");
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    console.log("Password hashed successfully.");

    console.log(`Searching and updating user with email: ${email}...`);
    
    // Upsert to ensure the user exists and is a superadmin with the hashed password
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        $set: {
          password_hash,
          role: "superadmin",
          status: "active"
        },
        $setOnInsert: {
          name: "Andres David",
          last_name: "Villamizar",
          strict_schedule_enforcement: false,
          notification_channels: []
        }
      },
      { upsert: true, new: true }
    );

    console.log("User updated successfully:");
    console.log({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password_hash: user.password_hash
    });

  } catch (error) {
    console.error("Error running the script:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main().catch(console.error);
