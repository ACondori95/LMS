import {Webhook} from "svix";
import User from "../models/User.js";

// API Controller Function to Manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
  try {
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    await whook.verify(req.rawBody, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const {data, type} = req.body;

    switch (type) {
      case "user.created": {
        const fullName = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(" ");
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: fullName || data.username || "New User",
          imageUrl: data.image_url,
        };
        await User.create(userData);
        console.log(`User created: ${userData.name} (${userData.email})`);
        res
          .status(200)
          .json({success: true, message: "User created successfully."});
        break;
      }

      case "user.updated": {
        const fullName = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(" ");
        const userData = {
          email: data.email_addresses[0].email_address,
          name: fullName || data.username || "New User",
          imageUrl: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, userData, {new: true});
        console.log(`User updated: ${userData.name} (${userData.email})`);
        res
          .status(200)
          .json({success: true, message: "User updated successfully."});
        break;
      }

      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        console.log(`User deleted: ${data.id}`);
        res
          .status(200)
          .json({success: true, message: "User deleted successfully."});
        break;
      }

      default:
        res.status(200).json({
          success: true,
          message: `Webhook type ${type} recieved and handled (or ignored).`,
        });
        break;
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.json({
      success: false,
      message: error.message || "Webhook processing failed.",
    });
  }
};
