import {clerkClient} from "@clerk/express";

// Update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    console.log("Hello");
    const userId = req.auth.userId;

    console.log(userId);

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {role: "educator"},
    });

    res.json({success: true, message: "You can publish a course now"});
  } catch (error) {
    res.json({success: false, message: error.message});
  }
};
