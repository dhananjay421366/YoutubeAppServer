import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/AppError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // //TODO: toggle like on video
  const userId = req.user?._id;

  try {
    const user = await User.findById(userId);
    const video = await Video.findById(videoId);

    if (!user || !video) {
      return res.status(404).json(new ApiError(404, "User or video not found"));
    }

    // Check if the like already exists
    const existingLike = await Like.findOne({
      video: videoId,
      likedBy: userId,
    });

    if (existingLike) {
      // Unlike the video (remove the like)
      await existingLike.deleteOne();
      return res.status(200).json(new ApiResponse(200, "Video unliked"));
      // .send({ message: "Video unliked" });
    } else {
      // Like the video (create a new like)
      const newLike = new Like({
        video: videoId,
        likedBy: userId,
      });
      await newLike.save();
      return res.status(200).json(new ApiResponse(200, "Video Liked"));
      // .({ message: "Video liked" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "something went wrong while like on video"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  const userId = req.user?._id;

  try {
    const user = await User.findById(userId);
    const comment = await Comment.findById(commentId);

    if (!user || !comment) {
      return res
        .status(404)
        .json(new ApiError(404, "User or comment not found"));
    }

    // Check if the like already exists
    const existingLike = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    });

    if (existingLike) {
      // Unlike the video (remove the like)
      await existingLike.deleteOne();
      return res.status(200).json(new ApiResponse(200, "Comment unliked"));
    } else {
      // Like the video (create a new like)
      const newLike = new Like({
        comment: commentId,
        likedBy: userId,
      });
      await newLike.save();
      return res.status(200).json(new ApiResponse(200, "Comment liked"));
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "something went wrong while like on comment"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  const userId = req.user?._id;

  try {
    const user = await User.findById(userId);
    const tweet = await Tweet.findById(tweetId);

    if (!user || !tweet) {
      return res.status(404).send("User or tweet not found");
    }

    // Check if the like already exists
    const existingLike = await Like.findOne({
      tweet: tweetId,
      likedBy: userId,
    });

    if (existingLike) {
      // Unlike the video (remove the like)
      await existingLike.deleteOne();
      return res.status(200).json(new ApiResponse(200, "tweet unliked"));
    } else {
      // Like the video (create a new like)
      const newLike = new Like({
        tweet: tweetId,
        likedBy: userId,
      });
      await newLike.save();
      return res.status(200).json(new ApiResponse(200, "tweet Liked"));
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "something went wrong while like on tweet"));
  }
});
const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;
  const userId = req.user?._id;

  // Convert page and limit to integers
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  // Build the search query
  const searchQuery = {
    likedBy: new mongoose.Types.ObjectId(userId),
  };

  // Determine sort order
  const sortOrder = sortType === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  try {
    const likedVideosAggregate = await Like.aggregate([
      {
        $match: searchQuery,
      },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "videoDetails",
        },
      },
      {
        $unwind: "$videoDetails",
      },
      {
        $match: query
          ? { "videoDetails.title": { $regex: query, $options: "i" } }
          : {},
      },
      {
        $lookup: {
          from: "users",
          localField: "videoDetails.owner",
          foreignField: "_id",
          as: "videoDetails.ownerDetails",
        },
      },
      {
        $unwind: "$videoDetails.ownerDetails",
      },
      {
        $project: {
          "videoDetails._id": 1,
          "videoDetails.videoFile": 1,
          "videoDetails.thumbnail": 1,
          "videoDetails.title": 1,
          "videoDetails.description": 1,
          "videoDetails.duration": 1,
          "videoDetails.views": 1,
          "videoDetails.isPublished": 1,
          "videoDetails.ownerDetails._id": 1,
          "videoDetails.ownerDetails.name": 1,
        },
      },
      {
        $sort: sortOptions,
      },
      {
        $skip: (pageNumber - 1) * limitNumber,
      },
      {
        $limit: limitNumber,
      },
    ]);
    console.log(  );

    // Get total count of liked videos for pagination purposes
    const totalLikedVideos = await Like.countDocuments({
      likedBy: new mongoose.Types.ObjectId(userId),
      // ...(query && { "videoDetails.title": { $regex: query, $options: "i" } }),
    });

    // Return the response
    res.status(200).json({
      page: pageNumber,
      limit: limitNumber,
      totalLikedVideos,
      totalPages: Math.ceil(totalLikedVideos / limitNumber),
      likedVideos: likedVideosAggregate.map((like) => like.videoDetails),
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "Something went wrong while fetching liked videos"
        )
      );
  }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
