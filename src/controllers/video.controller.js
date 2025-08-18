import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { v2 as cloudinary } from "cloudinary";


// 1.) Get all videos based on query, sort, pagination
// Also read mongoose aggregate paginate documentation to know more
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query


    // Validate required parameters
    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "User does not exist !")
    }

    // Determining sort direction
    const sortDirection = (String(sortType || "desc")).toLowerCase() === "asc" ? 1 : -1
    const sortField = sortBy || "createdAt"

    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                isPublished: true
            }
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
                            fullName: 1,
                            username: 1,
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
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        { //Doing sorting
            $sort: {
                [sortField]: sortDirection
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                owner: 1,
                likeCount: 1,
                likes: 1,
                view: 1,
                isPublished: 1
            }
        }
    ]

    const paginationOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        pagination: true
    }

    const videos = await Video.aggregatePaginate(pipeline, paginationOptions)
    if (!videos) {
        throw new ApiError(401, "Can't found videos !")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    docs: videos.docs,
                    totalDocs: videos.totalDocs,
                    totalPages: videos.totalPages,
                    currentPage: videos.page,
                    hasNextPage: videos.hasNextPage,
                    hasPreviousPage: videos.hasPrevPage,
                    pagingCounter: videos.pagingCounter,
                    nextPage: videos.nextPage,
                    previousPage: videos.prevPage
                },
                "Videos fetched successfully."
            )
        )
})

// ********************************************************************************************************************
// 2.) Get video, upload to cloudinary, create video
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    
    const userId = req.user._id;

    if (
        [title, description].some((fields) => fields?.trim() === "")
    ) {
        throw new ApiError(400, "Title and Description is required !");
    }

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
    if (!thumbnailLocalPath) {
        throw new ApiError(401, "Video thumbnail is required.")
    }
    
    const videoLocalPath = req.files?.videoFile[0]?.path
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required.");
    }
    

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile) {
        throw new ApiError(400, "Error while uploading video !");
    }
    if (!thumbnail) {
        throw new ApiError(400, "Error while uploading thumbnail !");
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration,
        isPublished: true,
        owner: userId
    })

    const createdVideo = await Video.findById(video._id)
    if (!createdVideo) {
        throw new ApiError(401, "Something went wrong while publishing video !");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, createdVideo, "Video published successfully.")
        )
})

// ********************************************************************************************************************
// 3.) Get video by id
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (! isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video id format !");
    }
    
    const userId = req.user._id;

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { view: 1 } },
        { new: true }
    )


    const pipeline = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
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
                            fullName: 1,
                            avatar: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "comment_id",
                foreignField: "video",
                as: "comments",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "createdBy",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        avatar: 1,
                                        username: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            createdBy: {
                                $first: "$createdBy"
                            }
                        }
                    },
                    {
                        $project: {
                            content: 1,
                            createdBy: 1,
                            createdAt: 1
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
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                owner: 1,
                comments: 1,
                createdAt: 1,
                isLiked: 1,
                likeCount: 1,
                view: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                isPublished: 1,
            }
        }
    ]

    const videoResult = await Video.aggregate(pipeline);

    await User.findByIdAndUpdate(
        userId,
        {
            $addToSet: {
                watchHistory: videoId
            }
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, videoResult, "Video fetched successfully.")
        )
})

// ********************************************************************************************************************
// 4.) Update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (! isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video id format !")
    }

    const currentVideo = await Video.findById(videoId);
    const oldThumbnailUrl = currentVideo?.thumbnail;
    if (!oldThumbnailUrl) {
        throw new ApiError(401, "Error while getting the old thumbnail !");
    }

    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(401, "Thumbnail is missing !");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail.url) {
        throw new ApiError(400, "Error while uploading a Thumbnail !");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail.url
            }
        },
        { new: true }
    );

    try {
        function getPublicIdFromUrl(url) {
            url = url.split('?')[0];
            const publicIdWithVersion = url.split('/upload/')[1];
            const publicIdWithoutVersion = publicIdWithVersion.replace(/v\d+\//, '');
            const publicId = publicIdWithoutVersion.replace(/\.[.^/]+$/, '');

            return publicId;
        }

        const publicId = getPublicIdFromUrl(oldThumbnailUrl);
        await cloudinary.uploader.destroy(publicId);

    } catch (error) {
        throw new ApiError(401, error?.message, "Cannot delete old thumbnail image");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video Updated sucessfully.")
        )

})

// ********************************************************************************************************************
// 5.) Delete video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const userId = req.user._id;

    if (!userId && !videoId) {
        throw new ApiError(400, "Something Went wrong !");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "Invalid video id format !");
    }

    const currentVideo = await Video.findById(videoId);
    const oldVideo = currentVideo?.videoFile;
    if (!oldVideo) {
        throw new ApiError(401, "Error while getting the old video !");
    }

    const video = await Video.findById(videoId);
    
    // Checking if user is valid for deletion or not
    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(400, "Unauthorised request");
    }

    const result = await Video.findByIdAndDelete(videoId);

    try {
        function getPublicIdFromUrl(url) {
            url = url.split('?')[0];
            const publicIdWithVersion = url.split('/upload/')[1];
            const publicIdWithoutVersion = publicIdWithVersion.replace(/v\d+\//, '');
            const publicId = publicIdWithoutVersion.replace(/\.[.^/]+$/, '');

            return publicId;
        }

        const publicId = getPublicIdFromUrl(oldVideo);
        await cloudinary.uploader.destroy(publicId);

    } catch (error) {
        throw new ApiError(401, error?.message, "Cannot delete old video");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, "Video deleted successfully !"))

})

// ********************************************************************************************************************
// 6.)Toggle publish status 
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if(! isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video id format !");
    }

    const userId = req.user?._id;
    if(!userId && !videoId){
        throw new ApiError(400, "Cannot fetch video !");
    }

    // Checking for existence of video
    const video = await Video.findById(videoId);
    if (! video) {
        throw new ApiError(403, "You are not allowed to update this video !");
    }

    const publishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {new: true}
    ).select("-owner -likes -comments -duration -view -createdAt -updatedAt")

    if(publishStatus.isPublished === true){
        return res
        .status(200)
        .json( new ApiResponse(200, publishStatus, "Video published successfully."))
    }else {
        return res
        .status(200)
        .json( new ApiResponse(200, publishStatus, "Video unpublished successfully."))
    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}