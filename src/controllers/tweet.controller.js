import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asynchandler.js"

// 1.) Create tweet
const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    if (! content) {
        throw new ApiError(400, "Content is required !");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(400, "User does not match !");
    }

    const tweet = await Tweet.create({
        content,
        owner: userId
    })
    if (! tweet) {
        throw new ApiError(401, "Cannot create tweet !");
    }

    return res
        .status(200)
        .json( new ApiResponse(200, tweet, "Tweet created successfully."))
})

// ********************************************************************************************************************
// 2.) Get user tweets
const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id format !");
    }

    const userTweets = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "tweets",
                localField: "_id",
                foreignField: "owner",
                as: "tweetOwner",
                pipeline: [
                    {
                        $project: {
                            owner: 1,
                            content: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likedTweets",
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
                tweetOwner: {
                    $first: "$tweetOwner"
                },
                likedTweets: {
                    $first: "$likedTweets"
                },
                likeCount: {
                    $size: "$likedTweets"
                },
                likedBy: {
                    $in: [
                        new mongoose.Types.ObjectId(userId),
                        "$likedTweets"
                    ]
                }
            }
        },
        {
            $project: {
                tweetOwner: 1,
                fullName: 1,
                username: 1,
                avatar: 1,
                likedTweets: 1,
                likedBy: 1,
                likeCount: 1
            }
        }
    ])
    if (!userTweets) {
        throw new ApiError(401, "Cannot fetch user tweets !");
    }

    return res
        .status(200)
        .json( new ApiResponse(200, userTweets, "User tweets fetched successfully."))
})

// ********************************************************************************************************************
// 3.) Update tweet
const updateTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    if (! content) {
        throw new ApiError(401, "Content is required !");
    }

    const {tweetId} = req.params;
    if (!tweetId) {
        throw new ApiError(400, "Invalid tweet id format !");
    }

    const userId = req.user?._id;
    if(! userId){
        throw new ApiError(401, "Cannot fetch user !");
    }

    const tweet = await Tweet.findById(tweetId);
    if (! tweet.owner.equals(userId)) {
        throw new ApiError(401, "You cannot update this tweet !");
    }
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        },
        {new : true}
    )
    if (! updatedTweet) {
        throw new ApiError(401, "Cannot update tweet !");
    }
    
    return res
        .status(200)
        .json( new ApiResponse(200, updatedTweet, "Tweet updated successfully."))
})

// ********************************************************************************************************************
//TODO: delete tweet
const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    if (!tweetId) {
        throw new ApiError(400, "Invalid tweet id format !");
    }

    const userId = req.user?._id;
    if(! userId){
        throw new ApiError(401, "Cannot fetch user !");
    }

    const tweet = await Tweet.findById(tweetId);
    if (! tweet.owner.equals(userId)) {
        throw new ApiError(401, "You cannot delete this tweet !");
    }

    await Tweet.findOneAndDelete(tweetId)

    return res
        .status(200)
        .json( new ApiResponse(200, "Tweet deleted successfully."))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}