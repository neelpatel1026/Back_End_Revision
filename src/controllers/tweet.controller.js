import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/likes.model.js";
import { ApiError } from "../util/ApiError.js";
import { ApiResponse } from "../util/ApiResponse.js";
import { asyncHandler } from "../util/asyncHandler.js";

/* ===================== CREATE TWEET ===================== */
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Tweet content is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  const populatedTweet = await tweet.populate("owner", "username avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedTweet, "Tweet created successfully"));
});

/* ===================== GET USER TWEETS ===================== */
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

/* ===================== UPDATE TWEET ===================== */
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { newContent } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  if (!newContent || !newContent.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  tweet.content = newContent;
  const updatedTweet = await tweet.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedTweet, "Successfully updated the tweet")
    );
});

/* ===================== DELETE TWEET ===================== */
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }

  // delete all likes related to this tweet (avoid orphan likes)
  await Like.deleteMany({ tweet: tweetId });

  await tweet.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully deleted the tweet"));
});

export {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
};
