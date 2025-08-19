import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"

// 1.)  Toggle like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video id format !");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(400, "Cannot fetch user !");
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    })

    if (existingLike) {

        await existingLike.deleteOne();

        return res
            .status(200)
            .json(new ApiResponse(201, "Removed Like from video."))
    } else {
        const newLike = new Like({
            video: videoId,
            likedBy: userId
        })

        await newLike.save();

        return res
            .status(200)
            .json(new ApiResponse(200, newLike, "Successfully liked the video."))
    }
})

// ********************************************************************************************************************
// 2.) Toggle like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment id format !");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(401, "Cannot fetch user !");
    }

    const existingCommentLike = await Like.findOne({
        comment: videoId,
        likedBy: userId
    })

    if (existingCommentLike) {

        await existingCommentLike.deleteOne();

        return res
            .status(200)
            .json(new ApiResponse(201, "Removed the comment like."))
    } else {
        const newCommentLike = new Like({
            comment: videoId,
            likedBy: userId
        })

        await newCommentLike.save();

        return res
            .status(200)
            .json(new ApiResponse(200, newCommentLike, "Comment liked successfully."))
    }
})

// ********************************************************************************************************************
// 3.) Toggle like on tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet id format !");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(401, "Cannot fetch user !");
    }

    const existingTweetLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId
    })

    if (existingTweetLike) {

        await existingTweetLike.deleteOne();

        return res
            .status(200)
            .json(new ApiResponse(201, "Removed the Tweet like."))

    } else {
        const newTweetLike = new Like({
            tweet: tweetId,
            likedBy: userId
        })

        await newTweetLike.save();

        return res
            .status(200)
            .json(new ApiResponse(200, newTweetLike, "Tweet liked successfully."))
    }
}
)

// ********************************************************************************************************************
// 4.) Get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(400, "Cannot fetch user !");
    }

    const pipeline = [
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "videoOwner",
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
                            foreignField: "video",
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
                            isLiked: {
                                $cond: {
                                    if: { $in: [new mongoose.Types.ObjectId(userId), "$likes.likedBy"] },
                                    then: true,
                                    else: false
                                }
                            },
                            likeCount: {
                                $size: "$likes"
                            }
                        }
                    },
                    {
                        $addFields: {
                            videoOwner: {
                                $first: "$videoOwner"
                            }
                        }
                    },
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            view: 1,
                            createdAt: 1,
                            videoOwner: 1,
                            isLiked: 1,
                            likeCount: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                likedVideos: 1,
                likedBy: 1,
                isLiked: 1,
                likeCount: 1
            }
        }
    ]

    const likedVideos = await Like.aggregate(pipeline);
    if (!likedVideos) {
        throw new ApiError(401, "Cannot get liked videos !");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, likedVideos, "Liked videos fetched successfully."))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}