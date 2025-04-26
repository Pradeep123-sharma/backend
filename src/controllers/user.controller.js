import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"

/* Now here first we call our asyncHandler fun and make it a high order fun and inside it we make our function that is async and then we will directly send response in json format with status code and message. */
const registerUser = asyncHandler( async (req, res)=>{
    // [a.] Get user details
    /* Here we are destructuring the object data that is coming from frontend. */
    const {fullName, email, username, password} = req.body
    console.log("email:", email); //checking if the data is coming

    // [b.] Validation
    
    /* Since we have to check for all fields that if they are empty or not. So instead of writing every time if statement we can write this in another way given below.*/
    if (
        [fullName, email, username, password].some((fields)=> fields?.trim() === "" ) //So here trim function removes any extra spaces and
    ) {
        throw new ApiError(400, "All fields are required.")
    }
    
    if (! email.includes("@")) {
        throw new ApiError(400, "Please write correct email id !");
    }

    // [c.] Check if user exists or not
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    }) /* So here we wil check with either username or email but if we want to check for user existence by both username and email then we can use operators like and, or, nor by using $ sign. */

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists.");
    }
    
    // [d.] Check for images
    /* Here we are getting the path of a file. Because we know that we have told the multer that add the file in given destination as specified(in temp folder) so that's why we can get the path of file. */
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    if (! avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.");
    }

    // [e.] Upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Checking if avatar is uploaded successfully on cloudinary
    if (! avatar) {
        throw new ApiError(400, "Avatar file is required.");
    }

    // [f.] Creating user object and pass entries
    const user = await User.create({
        fullName,
        avatar: avatar.url, // Since avatar will get whole response so we will extract url only.
        coverImage: coverImage?.url, /* Since we have not put any restrictions on coverImage so it may be present or not. */
        email,
        password,
        username: username.toLowerCase()
    })
    // [g.] Checking if user object is created and removing password and refresh token from response
    const createdUser = await User.findById(user._id).select(
        " -password -refreshToken "
    )
    if (! createdUser) {
        throw new ApiError(500, "Something went wrong while registering with user.");
    }

    // [h.] Return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully.")
    )
} )

export { registerUser };
