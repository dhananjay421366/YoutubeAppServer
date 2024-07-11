import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscripion.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/AppError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId =  req.user?._id; // Assuming req.user contains the authenticated user's info

  try {
    // Check if the channel exists
    const channel = await User.findById(channelId);
    if (!channel) {
      return res.status(404).json(new ApiError(404, "Channel not found"));
    }

    // Total videos
    const totalVideos = await Video.countDocuments({ owner: channelId });

    // Total views
    const totalViewsResult = await Video.aggregate([
      { $match: { owner: channelId } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);
    const totalViews = totalViewsResult[0]?.totalViews || 0;

    // Total likes
    const totalLikesResult = await Like.aggregate([
      {
        $match: {
          video: {
            $in: await Video.find({ owner: channelId }).distinct("_id"),
          },
        },
      },
      { $count: "totalLikes" },
    ]);
    const totalLikes = totalLikesResult[0]?.totalLikes || 0;

    // Total subscribers
    const totalSubscribers = await Subscription.countDocuments({
      channel: channelId,
    });

    const stats = {
      totalVideos,
      totalViews,
      totalLikes,
      totalSubscribers,
    };

    res
      .status(200)
      .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json(
        new ApiError(500, "An error occurred while fetching channel stats")
      );
  }
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query;

  if (!channelId) {
    res.status(400).json({ message: 'Channel ID is required' });
    return;
  }

  // Convert page and limit to integers
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  // Determine sort order
  const sortOrder = sortType === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  try {
    // Fetch videos from the database with pagination and sorting
    const videos = await Video.find({ channelId })
      .sort(sortOptions)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    // Get total count of videos for pagination purposes
    const totalVideos = await Video.countDocuments({ channelId });

    // Return the response
    res.status(200).json({
      page: pageNumber,
      limit: limitNumber,
      totalVideos,
      totalPages: Math.ceil(totalVideos / limitNumber),
      videos,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching channel videos', error });
  }
});

export { getChannelStats, getChannelVideos };
