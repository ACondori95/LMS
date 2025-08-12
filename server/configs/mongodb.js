import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Attempt to connect to the MongoDB databases
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Successfully connected to MongoDB");
  } catch (error) {
    // Handle connection errors
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
