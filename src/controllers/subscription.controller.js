import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"

// 1.) Toggle subscription
const toggleSubscription = asyncHandler(async (req, res) => {
    let { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(401, "Invalid channel id ");
    }
    // console.log(channelId)

    let userId = req.user._id;
    console.log(userId);

    const userObjectId = new mongoose.Types.ObjectId(userId)
    const chanelObjectId = new mongoose.Types.ObjectId(channelId)
    // const channel = await User.findById(userId)
    // console.log(channel);

    /*     console.log(userId);
        console.log(channelId);
        console.log(channelObjectId); */

    // Checking for existing subscription
    const existingSubscription = await Subscription.findOne({
        subscriber: userObjectId,
        channel: chanelObjectId
    })

    if (existingSubscription) {

        await existingSubscription.deleteOne()

        console.log(existingSubscription);

        return res
            .status(200)
            .json(new ApiResponse(201, "User is Unsubscribed."))
    }

    // Creating a new object for new subscriber
    if (!existingSubscription) {

        const newSubscription = new Subscription({
            subscriber: userObjectId,
            channel: chanelObjectId
        })

        await newSubscription.save();

        return res
            .status(200)
            .json(new ApiResponse(200, "User is subscribed successfully."))
    }

})

// *******************************************************************************************************************************************************
// 2.) Controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const channelObjectId = new mongoose.Types.ObjectId(channelId)
    if (!channelObjectId) {
        throw new ApiError(401, "Invalid channel id !");
    }

    const userId = req.user?._id

    const channelSubscribers = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "subscriber",
                            foreignField: "_id",
                            as:"subscriberInfo",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            subscriberInfo: "$subscriberInfo"
                        }
                    },
                    {
                        $project: {
                            channel:1,
                            subscriber:1,
                            subscriberInfo:1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
            }
        },
        {
            $project: {
                username:1,
                fullName:1,
                subscribers:1,
                subscribersCount:1
            }
        }
    ])

    if (!channelSubscribers?.length) {
        throw new ApiError(404, "Zero Subscribers !");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channelSubscribers[0], "Subscribers fetched successfully.")
        )
})

// *******************************************************************************************************************************************************
// 3.) Controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const subscriberObjectId = new mongoose.Types.ObjectId(subscriberId)

    if (!subscriberObjectId) {
        throw new ApiError(400, "Cannot get Subscriber !")
    }
    const userId = req.user?._id

    const subscribedChannels = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "channel",
                            foreignField: "_id",
                            as: "channelInfo",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            channelInfo: "$channelInfo"
                        }
                    },
                    {
                        $project: {
                            channel:1,
                            subscriber:1,
                            channelInfo:1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                }
            }
        },
        {
            $project: {
                username:1,
                fullName:1,
                subscribedTo:1,
                channelsSubscribedToCount:1
            }
        }
    ])

    if (!subscribedChannels?.length) {
        throw new ApiError(404, "Zero Subscribed Channels !");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, subscribedChannels[0], "Subscribed channels fetched successfully.")
        )

})


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}