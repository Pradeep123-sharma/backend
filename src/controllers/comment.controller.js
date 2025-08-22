import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"

// 1.) Get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id format !");
    }

    const userId = req.user?._id;
    const { page = 1, limit = 10 } = req.query

    const pipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "commentOwner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likedUserIds: {
                    $map: {
                        input: "$likes",
                        as: "like",
                        in: "$likes.likedBy"
                    }
                }
            }
        },
        {
            $addFields: {
                isLiked: {
                    $in: [
                        new mongoose.Types.ObjectId(userId),
                        "$likedUserIds"
                    ]
                },
                likeCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $addFields: {
                commentOwner: {
                    $first: "$commentOwner"
                }
            }
        },
        {
            $project: {
                content: 1,
                commentOwner: 1,
                likeCount: 1,
                isLiked: 1
            }
        }
    ]
    const paginationOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        pagination: true
    }

    const comments = await Comment.aggregatePaginate(pipeline, paginationOptions)
    if (!comments) {
        throw new ApiError(401, "Cannot find comments !");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {
                totalDocs: comments.totalDocs,
                count: comments.docs?.length,
                totalComments: comments.docs,
                totalPages: comments.totalPages,
                currentPage: comments.page,
                hasNextPage: comments.hasNextPage,
                hasPrevPage: comments.hasPrevPage,
                nextPage: comments.nextPage,
                prevPage: comments.prevPage,
                pagingCounter: comments.pagingCounter,
            },
            "Video comments fetched successfully."
        ))
})

// ********************************************************************************************************************
// 2.) Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id format !");
    }
    const { content } = req.body;
    if (!content) {
        throw new ApiError(401, "Comment is required !");
    }

    const userId = req.user?._id;

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: userId
    })
    if (!comment) {
        throw new ApiError(400, "Comment not created !");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment added to video successfully. "))
})

// ********************************************************************************************************************
// 3.) Update a comment
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id format !");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(400, " Cannot fetch user !");
    }

    const { content } = req.body;
    if (!content) {
        throw new ApiError(401, "Comment is required !");
    }

    const comment = await Comment.findById(commentId);

    if (comment.owner.toString() === userId.toString()) {
        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content
                }
            },
            { new: true }
        )

        return res
            .status(200)
            .json(new ApiResponse(200, updatedComment, "Comment updated successfully !"))

    } else {
        throw new ApiError(401, "You cannot update this Comment !");
    }
})

// ********************************************************************************************************************
// 4.) Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    if (! isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id format !");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(401, "Cannot fetch user !");
    }

    const comment = await Comment.findById(commentId);
    if (! comment.owner.equals(userId)) {
        throw new ApiError(401, "You cannot delete this comment !");
    }
    const deletedComment = await Comment.findOneAndDelete(commentId);
    if (! deletedComment) {
        throw new ApiError(400, "Cannot delete comment !");
    }

    return res
        .status(200)
        .json( new ApiResponse(200, "Comment deleted successfully !"))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}