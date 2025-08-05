import {Webhook} from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import {Purchase} from "../models/Purchase.js";
import Course from "../models/Course.js";

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

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers["stripe-signature"];

  let event;

  try {
    event = Stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const {purchaseId} = session.data[0].metadata;

      const purchaseData = await Purchase.findById(purchaseId);
      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(
        purchaseData.courseId.toString()
      );

      courseData.enrolledStudents.push(userData);
      await courseData.save();

      userData.enrolledCourses.push(courseData._id);
      await userData.save();

      purchaseData.status = "completed";
      await purchaseData.save();

      break;
    }

    case "payment_method.payment_failed": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const {purchaseId} = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);
      purchaseData.status = "failed";
      await purchaseData.save();

      break;
    }
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
};
