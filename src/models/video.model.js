import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,// cloudinary url
            required: true
        }, // here we will only store videos.
        thumbnail: {
            type: String, //cloudinary url
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: Number,/* cloudinary url because as soon as cloudinary uploads a file it gives us info about that file such as url, duration of video */
            required: true
        },
        view: {
            type: Number,
            default: 0 //Initially default will be 0 but we will increase it.
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);