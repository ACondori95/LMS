import {v2 as cloudinary} from "cloudinary";

const connectCloudinary = async () => {
  try {
    // Configure Cloudinary with environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET_KEY,
    });
    console.log("Cloudinary configured successfully.");
  } catch (error) {
    // Catch and log any errors during configuration
    console.error("Cloudinary configuration failed:", error.message);
    process.exit(1);
  }
};

export default connectCloudinary;
