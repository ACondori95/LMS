import {Webhook} from "svix";
import User from "../models/User.js";
import Purchase from "../models/Purchase.js";
import Course from "../models/Course.js";
import {MercadoPagoConfig, Payment} from "mercadopago";

// Initialize Mercado Pago with a client instance
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const paymentClient = new Payment(client);

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
      default:
        res.status(200).json({
          success: true,
          message: `Webhook type ${type} recieved and handled (or ignored).`,
        });
        break;
    }
  } catch (error) {
    console.error("Clerk Webhook processing error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Clerk webhook processing failed.",
    });
  }
};

// Mercado Pago Webhook
export const mercadopagoWebhooks = async (req, res) => {
  const {body} = req;
  const {type, data} = body;

  // Mercado Pago required a 200 response to indicate the webhook was received.
  // The logic is handled after sending the response.
  res.status(200).send("OK");

  try {
    if (type === "payment") {
      const paymentDetails = await paymentClient.get({id: data.id});
      const {external_reference, status} = paymentDetails.body;
      const purchaseId = external_reference;

      if (!purchaseId) {
        console.error("Mercado Pago Webhook Error: Missing external_reference");
        return;
      }

      if (status === "approved") {
        const purchaseData = await Purchase.findByIdAndUpdate(
          purchaseId,
          {status: "completed"},
          {new: true}
        );

        if (!purchaseData) {
          console.error(`Purchase with ID ${purchaseId} not found.`);
          return;
        }

        const userData = await User.findById(purchaseData.userId);
        const courseData = await Course.findById(purchaseData.courseId);

        if (!userData || !courseData) {
          console.error(
            `User of course not found for purchase ID ${purchaseId}`
          );
          return;
        }

        // Add the course to the user's enrolled list
        userData.enrolledCourses.addToSet(courseData._id);
        await userData.save();

        // Add the user to the course's enrolled students list
        courseData.enrolledStudents.addToSet(userData._id);
        await courseData.save();

        console.log(
          `Purchase completed for user ${userData._id} and course ${courseData._id}`
        );
      } else if (status === "rejected") {
        await Purchase.findByIdAndUpdate(
          purchaseId,
          {status: "failed"},
          {new: true}
        );
        console.log(`Purchase failed for purchase ID ${purchaseId}`);
      } else {
        console.log(`Unhandled Mercado Pago webhook status: ${status}`);
      }
    } else {
      console.log(`Unhandled Mercado Pago webhook type: ${type}`);
    }
  } catch (error) {
    console.error("Mercado Pago Webhook processing error:", error);
  }
};
