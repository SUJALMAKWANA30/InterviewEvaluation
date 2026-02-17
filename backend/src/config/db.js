import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "InterviewEvaluation",
      family: 4, // Force IPv4 — fixes DNS SRV resolution issues in Node.js
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}, DB: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed");
    console.error(error.message);
    process.exit(1); // kill app if DB fails
  }
};

export default connectDB;
