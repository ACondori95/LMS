import {clerkClient} from "@clerk/express";

// Middleware (Protect Educator Routes)
export const protectEducator = async (req, res, next) => {
  try {
    const {userId} = req.auth;

    // Check if the user is authenticated at all
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication Failed: User not found.",
      });
    }

    const user = await clerkClient.users.getUser(userId);

    // Check the user's role from publicMetadata
    if (user.publicMetadata.role !== "educator") {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You do not have permission to access this resource.",
      });
    }

    // If the user is an educator, proceed to the next middleware
    next();
  } catch (error) {
    // Handle potential errors from Clerk API for other issues
    console.error("Authentication Error in protectEducator:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during authentication.",
    });
  }
};
