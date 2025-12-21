import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video} from "../models/video.model.js"
import { populate } from "dotenv"

//aama bija ae aeggrigation pipeline use kari che ane aaode nai kari to ek var aeno code joi levo
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "video not found")
    }

    const skip = (page-1)*limit

    const comments = await Comment.find({Video : videoId})
    .populate("owner", "username avatar")
    .sort({ createdAt:-1 })
    .limit(limit)
    .skip(skip)

    return res.status(201).json(
        new ApiResponse(201, comments, "Comment added successfully")
     )
})


const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const {videoId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    if (!content || !content.trim()) {
           throw new ApiError(400, "Comment content is required");
    }


    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id,

    })

    const populatedComment = await comment.populate(
    "owner",
    "username avatar"
  );

  res.status(201).json(
    new ApiResponse(201, populatedComment, "Comment added successfully")
  );
});


const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const {commentId} = req.params;
    const {content} = req.body;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "content cannot be empty")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "comment not found")
    }

    if (!comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to update this comment");
    }

    comment.content = content;
    const updatedComment = await comment.save();

    return res.status(200).json(
        ApiResponse(
            200,
            updatedComment,
            "comment update successfully"
        )
    )
})


const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const { commentId } = req.params

    if (!commentId) {  
        throw new ApiError(400, "Invalid comment id")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "comment not found")
    }

    if (!comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to update this comment");
    }

    await comment.deleteOne();

    res.status(200).json(
    new ApiResponse(200, {}, "Comment deleted successfully")
  );
});

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }