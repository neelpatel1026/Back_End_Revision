import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Tweet } from "../models/tweet.models.js";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video file not found");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    video.likes = Math.max(0, video.likes - 1);
    await video.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Like removed from this video"));
  }

  const like = await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });

  video.likes += 1;
  await video.save();

  const updatedLike = await like.populate("likedBy", "username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedLike, "Successfully liked this video"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingComment = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (existingComment) {
    await existingComment.deleteOne();
    comment.likes = Math.max(0, comment.likes - 1);
    await comment.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Like removed from this comment"));
  }

  const like = await Like.create({
    comment: commentId,
    likedBy: req.user._id,
  });

  comment.likes += 1;
  await comment.save();

  const updatedLike = await like.populate("likedBy", "username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedLike, "Successfully liked this comment"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet file not found");
  }

  const existingTweet = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (existingTweet) {
    await existingTweet.deleteOne();
    tweet.likes = Math.max(0, tweet.likes - 1);
    await tweet.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Like removed from this tweet"));
  }

  const like = await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  tweet.likes += 1;
  await tweet.save();

  const updatedLike = await like.populate("likedBy", "username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedLike, "Successfully liked this tweet"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.find({
    video: { $exists: true },
    likedBy: req.user._id,
  })
    .populate("video", "videoFile thumbnail title description duration")
    .sort({ createdAt: -1 });

  if (!likedVideos.length) {
    throw new ApiError(404, "No liked videos found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "All liked videos are fetched"));
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};
