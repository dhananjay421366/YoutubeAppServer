import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscripion.model.js";
import { ApiError } from "../utils/AppError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params; // Assuming channelId is passed in params
  const subscriberId = req.user?._id; // The ID of the user making the request

  try {
    // Check if the channel exists
    const channel = await User.findById(channelId);
    if (!channel) {
      return res.status(404).json(new ApiError(404, "Channel not found"));
    }

    // Find the existing subscription
    let subscription = await Subscription.findOne({
      subscriber: subscriberId,
      channel: channelId,
    });

    if (!subscription) {
      // If the subscription doesn't exist, create a new one
      subscription = new Subscription({
        subscriber: subscriberId,
        channel: channelId,
      });
      await subscription.save();
      return res.status(200).json({
        success: true,
        message: "Subscribed successfully",
        subscription,
      });
    } else {
      // If the subscription exists, delete it (unsubscribe)
      await subscription.deleteOne();
      return res
        .status(200)
        .json({ success: true, message: "Unsubscribed successfully" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json(
        new ApiError(
          500,
          "An error occurred while toggling the subscription status"
        )
      );
  }
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id; // Assuming user ID is stored in req.user._id

    // Find all subscriptions where the subscriber is the current user
    const subscriptions = await Subscription.find({
      subscriber: userId,
    })
      .populate("channel")
      .select("-password -refreshToken -watchHistory");

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ message: "No subscriptions found" });
    }

    // Extract the channels from the subscriptions
    const channels = subscriptions.map((subscription) => subscription.channel);
    // Send the list of subscribed channels
    res.status(200).json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
// controller to return users list to which channel has subscribed it  users
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId || req.user?._id; // Assuming req.user contains the authenticated user's info

  try {
    // Check if the channel exists
    const channel = await User.findById(channelId);
    if (!channel) {
      return res.status(404).json(new ApiError(404, "Channel not found"));
    }

    // Find all subscriptions where the subscriber is the specified channel
    const subscriptions = await Subscription.find({ subscriber: channelId })
      .populate("channel", "fullname username avatar")
      .select("-password -refreshToken -watchHistory");

    // Extract subscribed channels' details
    const subscribedChannels = subscriptions.map(
      (subscription) => subscription.channel
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribedChannels,
          "Subscribed channels fetched successfully"
        )
      );
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json(
        new ApiError(
          500,
          "An error occurred while fetching subscribed channels"
        )
      );
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
