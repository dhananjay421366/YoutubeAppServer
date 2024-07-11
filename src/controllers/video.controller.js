import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/AppError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  // Convert page and limit to integers
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  // Build the search query
  const searchQuery = {
    ...(query && { title: { $regex: query, $options: "i" } }), // Assuming you want to search by title
    ...(userId && { userId }), // Assuming you want to filter by userId
  };

  // Determine sort order
  const sortOrder = sortType === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  // Fetch videos from the database with pagination and sorting
  const videos = await Video.find(searchQuery)
    .sort(sortOptions)
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  // Get total count of videos for pagination purposes
  const totalVideos = await Video.countDocuments(searchQuery);

  // Return the response
  res.status(200).json({
    page: pageNumber,
    limit: limitNumber,
    totalVideos,
    totalPages: Math.ceil(totalVideos / limitNumber),
    videos,
  });
});

const publishAVideo = asyncHandler(async (req, res) => {
  // req.body -> data
  // check validation
  //check videofile validation ;videofile
  // upload on cloudinary
  // Create entry in the database
  // Check if video was created
  // Respond with success message

  //
  const { title, description } = req.body;

  // Validation
  if ([title, description].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  // Check for video file
  const videoLocalPath = req.files?.videoFile?.[0]?.path;

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is required");
  }

  // Upload video to Cloudinary
  const videoResult = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  // Check if video upload was successful
  if (!videoResult) {
    throw new ApiError(400, "Video file is required");
  }
  // Check if thumbnail upload was successful
  if (!thumbnail) {
    throw new ApiError(400, "thumbnail file is required");
  }

  const videoDuration = parseFloat(videoResult.duration).toFixed(2);
  // Create entry in the database
  const video = await Video.create({
    title,
    description,
    duration: videoDuration,
    videoFile: videoResult?.url,
    thumbnail: thumbnail?.url, // You might want to adjust this based on how you handle thumbnails
  });

  // Check if video was created
  if (!video) {
    throw new ApiError(500, "Failed to create video entry in the database");
  }

  // Respond with success message
  return res
    .status(201)
    .json(new ApiResponse("200", video, "Video published successfully"));
});
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Validate videoId
  if (!videoId) {
    throw new ApiError(400, "Video ID is missing");
  }

  // Fetch video by ID
  const video = await Video.findById(videoId);

  // Check if the video exists
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Return the video data
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailFile = req.files?.thumbnail?.[0];

  // Validate input
  if (!videoId) {
    throw new ApiError(400, "Video ID is missing");
  }

  // Build the update object dynamically
  const updateFields = {};
  if (title) updateFields.title = title;
  if (description) updateFields.description = description;

  // Retrieve the video to get the old thumbnail URL
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const oldThumbnailUrl = video.thumbnail;

  // Handle the thumbnail file upload if provided
  if (thumbnailFile) {
    const thumbnailLocalPath = thumbnailFile.path;

    // Upload the new thumbnail to Cloudinary
    const newThumbnailUrl = await uploadOnCloudinary(thumbnailLocalPath);

    // Check if thumbnail upload was successful
    if (!newThumbnailUrl) {
      throw new ApiError(400, "Thumbnail upload failed");
    }

    // Add the new thumbnail URL to update fields
    updateFields.thumbnail = newThumbnailUrl;

    // If there's an old thumbnail, delete it from Cloudinary
    if (oldThumbnailUrl) {
      const oldThumbnailPublicId = oldThumbnailUrl
        .split("/")
        .pop()
        .split(".")[0];
      await deleteFromCloudinary(oldThumbnailPublicId);
    }
  }

  // Find the video by ID and update it
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  // Check if the video exists
  if (!updatedVideo) {
    throw new ApiError(404, "Video not found");
  }

  // Return the updated video data
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!videoId) {
    throw new ApiError(404, "videoId is missing");
  }

  const video = await Video.findByIdAndDelete(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Return a success response
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle publish and unPublish video
  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json(new ApiError(404, "video not found"));
    }

    // Check if the video already exists
    const existingVideo = await Video.findOne({
      video: videoId,
    });

    if (existingVideo) {
      // unPublishe the video (remove the video)
      await existingLike.deleteOne();
      return res.status(200).json(new ApiResponse(200, "Video unPublished"));
    } else {
      // Published the video (create a new video)
      const nweVideo = new Video({
        video: videoId,
      });
      await nweVideo.save();
      return res.status(200).json(new ApiResponse(200, "Video Published"));
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "something went wrong while publishing Video"));
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
