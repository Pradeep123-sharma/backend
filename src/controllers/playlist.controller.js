import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"
import { User } from "../models/user.model.js"

// 1.) Create playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if ([name, description].some((fields) => fields.trim() === "")) {
        throw new ApiError(400, "Name and description is required !");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(401, "Cannot find user !");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: userId
    })
    if (!playlist) {
        throw new ApiError(400, "Playist not created !");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist created successfully."))
})

// ********************************************************************************************************************
// 2.) Get user playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (! ( userId && isValidObjectId(userId))) {
        throw new ApiError(400, "Invalid User id format !");
    }

    const user = await User.findById(userId).select("fullName username avatar");
    if (! user) {
        throw new ApiError(401, "User not found !");
    }

    const playlists = await Playlist.find(
        {owner : userId}
    ).select("-videos -owner")

    if (! playlists) {
        throw new ApiError(400, "Cannot fetch playlists !");
    }

    return res
        .status(200)
        .json( new ApiResponse(200, playlists, "Playlists fetched successfully."))
})

// ********************************************************************************************************************
// 3.) Get playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (! isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist id format !");
    }

    const playlist =  await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideos",
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
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
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
                            videoOwner: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                videoCount: {
                    $size: "$playlistVideos"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videoCount: 1,
                playlistVideos: 1
            }
        }
    ])

    if(!playlist){
        throw new ApiError(401, "Cannot fetch playlist !");
    }

    return res
        .status(200)
        .json( new ApiResponse(200, playlist, "Playlist fetched successfully."))
})

// ********************************************************************************************************************
// 4.) Adding video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    if (! isValidObjectId(playlistId, videoId)) {
        throw new ApiError(400, "Invalid id format !");
    }

    const existingVideo = await Playlist.findOne({
        _id: playlistId,
        videos: videoId
    })

    if (existingVideo) {
        return res
            .status(200)
            .json( new ApiResponse(200, "Video already exists in playlist."))
    
    }else{

        const addVideo = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $addToSet: {
                    videos: videoId
                }
            },
            {new: true}
        )
        if (! addVideo) {
            throw new ApiError(401, "Cannot add video to playlist !")
        }

        return res
            .status(200)
            .json( new ApiResponse(200, addVideo, "Video added to playlist successfully."))
    }

})

// ********************************************************************************************************************
// 5.) Remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (! isValidObjectId(playlistId, videoId)) {
        throw new ApiError(400, "Invalid id format !");
    }

    const deletedVideo = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $pull: {
                    videos: videoId
                }
            },
            {new: true}
    )
    if (! deletedVideo) {
        throw new ApiError(401, "Cannot delete video form playlist !");
    }

    return res
        .status(200)
        .json( new ApiResponse(200, "Video deleted from playlist successfully."))
})

// ********************************************************************************************************************
// 6.) Delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (! isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist id format !")
    }

    const userId = req.user?._id;
    if(! userId){
        throw new ApiError(400, "Cannot fetch user !")
    }

    const playlist = await Playlist.findById(playlistId);
    if (! playlist.owner.equals(userId)) {
        throw new ApiError(401, "You cannot delete this playlist !")
    }

    const deletePlaylist = await Playlist.findOneAndDelete(playlistId);
    if (! deletePlaylist) {
        throw new ApiError(400, "Something went wrong while deleting the Playlist.")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Playlist deleted successfully."))
})

// ********************************************************************************************************************
// 7.) Update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Video id format !");
    }

    const { name, description } = req.body;
    if ([name, description].some((fields) => fields.trim() === "")) {
        throw new ApiError(400, "Title and Description is required !");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(401, "Cannot fetch user !");
    }

    const playlist = await Playlist.findById(playlistId);

    if (playlist.owner.toString() === userId.toString()) {
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $set: {
                    name,
                    description
                }
            },
            {new: true}
        ).select("-videos")
        
        return res
            .status(200)
            .json( new ApiResponse(200, updatedPlaylist, "Playlist updated successfully !"))

    }else {
        throw new ApiError(401, "You cannot update this video !");
    }
    
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}