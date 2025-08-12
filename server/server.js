import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import {clerkWebhooks, mercadopagoWebhooks} from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import {clerkMiddleware} from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";
import courseRouter from "./routes/courseRoutes.js";
import userRouter from "./routes/userRoutes.js";

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Function to connect to databases and start the server
const startServer = async () => {
  try {
    // Connect to database and cloud services
    await connectDB();
    await connectCloudinary();
    console.log("Database and Cloudinaty connected successfully.");

    // Webhook Middleware (must be before express.json() for raw body)
    app.post(
      "/clerk",
      express.json({
        verify: (req, res, buf) => {
          req.rawBody = buf.toString();
        },
      }),
      clerkWebhooks
    );
    app.post(
      "/mercadopago-webhook",
      express.raw({type: "application/json"}),
      mercadopagoWebhooks
    );

    // Global Middlewares (applied to all routes after the webhooks)
    app.use(cors());
    app.use(express.json());
    app.use(clerkMiddleware());

    // Routes
    app.get("/", (req, res) => res.send("API is running!"));
    app.use("/api/educator", educatorRouter);
    app.use("/api/course", courseRouter);
    app.use("/api/user", userRouter);

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database or cloud service:", error);
    process.exit(1);
  }
};

startServer();
