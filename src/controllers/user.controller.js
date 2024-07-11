import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/AppError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong when generating access and refresh tokens"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  // steps
  // get user details from frontend
  // validation  - non empty
  //  check if user is already exists - username ,email
  //  check for images check  for avatar
  // upload them cludinary
  // create user object - create entry in db
  // remove password refresh tocken fields from response
  // chech for user creation
  // return response

  // get user details from frontend
  const { fullname, email, username, password } = req.body;
  // console.log("email: ", email);

  // validation
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  //  check if user is already exists - username ,email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User  with email or username already exists");
  }
  // console.log(req.files);

  //  check for images check  for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path; // getting file avatar
  // console.log(avatarLocalPath);
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  // let coverImageLocalPath;
  // if (
  //   req.files &&
  //   Array.isArray(req.files.coverImage) &&
  //   req.files.coverImage.length > 0
  // ) {
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }

  // console.log(coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is required");
  }

  // upload them cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar  file is required");
  }
  if (!coverImage) {
    throw new ApiError(400, "coverImage  file is required");
  }

  // create user object - create entry in db
  const user = await User.create({
    fullname,
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || "",
    email,
    password,
    username,
  });

  // remove password refresh tocken fields from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // return response
  return res
    .status(201)
    .json(new ApiResponse("200", createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookies
  // response
  const { email, username, password } = req.body;
  // console.log(email, username, password);

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = (req.cookie.refreshToken =
    req.cookie.refreshToken);

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const deodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(deodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh Token ");
    }

    if (incomingRefreshToken !== user?.refreshTocken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email, username } = req.body;

  if (!fullname || !email || !username) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
        username: username,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  // Retrieve the current user's avatar URL  for deleting cloudinary
  const user = await User.findById(req.user?._id).select("avatar");
  const oldAvatarUrl = user?.avatar;

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Error while uploading on avatar ");
  }

  const Updateduser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  // After new image file uploaded Finally Delete old avatar from Cloudinary
  if (oldAvatarUrl) {
    const oldAvatarPublicId = oldAvatarUrl.split("/").pop().split(".")[0]; // Extract public ID from the URL
    await deleteFromCloudinary(oldAvatarPublicId);
    // console.log("old file deleted sucessfully");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, Updateduser, "Avatar image updated sucessfully")
    );
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(400, "Error while uploading on coverImage ");
  }
  // Retrieve the current user's avatar URL  for deleting cloudinary
  const user = await User.findById(req.user?._id).select("coverImage");
  const oldAvatarUrl = user?.coverImage;

  const Updateduser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  // After new image file uploaded Finally Delete old coverImage  from Cloudinary
  if (oldAvatarUrl) {
    const oldAvatarPublicId = oldAvatarUrl.split("/").pop().split(".")[0]; // Extract public ID from the URL
    await deleteFromCloudinary(oldAvatarPublicId);
    //console.log("old coverImage file deleted sucessfully");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, Updateduser, "CoverImage updated sucessfully"));
});

const getUserChannelPrfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // lookup for our subscriber
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // lookup for me subscriber  to another
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  //console.log(channel);
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async(req, res) => {
  const user = await User.aggregate([
      {
          $match: {
              _id: new mongoose.Types.ObjectId(req.user?._id)
          }
      },
      {
          $lookup: {
              from: "videos",
              localField: "watchHistory",
              foreignField: "_id",
              as: "watchHistory",
              pipeline: [
                  {
                      $lookup: {
                          from: "users",
                          localField: "owner",
                          foreignField: "_id",
                          as: "owner",
                          pipeline: [
                              {
                                  $project: {
                                      fullName: 1,
                                      username: 1,
                                      avatar: 1
                                  }
                              }
                          ]
                      }
                  },
                  {
                      $addFields:{
                          owner:{
                              $first: "$owner"
                          }
                      }
                  }
              ]
          }
      }
  ])

  return res
  .status(200)
  .json(
      new ApiResponse(
          200,
          user[0].watchHistory,
          "Watch history fetched successfully"
      )
  )
})



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelPrfile,
  getWatchHistory,
};

// $lookup fields details
//from: Specifies the joined collection.

// localField: Specifies the field from the input documents.

// foreignField: Specifies the field from the joined collection.

// as: Specifies the name of the output array field.

// $project fields details

//The $project stage is used in a MongoDB aggregation pipeline to specify which fields to include in the output documents. It can be used to retain only the necessary fields and create new computed fields if needed. The $project stage is typically placed at the end of the pipeline, but using it at the beginning or middle of the pipeline to reduce the number of fields passed to subsequent stages is unlikely to improve performance, as the database performs this optimization automatically.
