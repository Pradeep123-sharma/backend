import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// [d.] Generating access and refresh token
/* We dont need asynchandler because we are not making any web request. This is a only a nirmal internal method. Also it will take userid as a parameter as we have verified the user. */
const generateAccessAndRefreshTokens = async (userId) =>{
    try {
        // Finding the user for whom access and refresh tokens will be generated
        const user = await User.findById(userId);
        // if (!user) {
        //     throw new ApiError(404, "User not found for token generation.");
        // } 

        /* => Calling generateAccessToken and generateRefreshToken methods from user.model. 
        => Humne yaha 'user.' karke function isliye call kiya hai kyunki agar hum asai hi simply call kar rhe hai to refrence error aa ja rha hai. 
        => Error is coming because 'generateAccessToken' and 'generateRefreshToken' are instance methods on the user document, not standalone functions.You should call them on the user object you fetched from the database.*/ 
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Now we have to save new refresh token in our database.To do so first we have to add the value of refresh token in 'user' object.
        user.refreshToken = refreshToken;
        /* Now .save is a mongodb method. when we try to save it then mongoose model gets kickin which means saving,validating and updating a document in MongoDB. So we require password again. So to overcome this problem we pass another parameter also i.e. validateBeforeSave and set it to false. */
        await user.save({validateBeforeSave :false});
        
        return {accessToken, refreshToken};

    } catch (error) {
        /* console.error("Token generation error:", error); //For checking why tokens are not generating. Gives actual error */
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens.");
    }    
} 


/* Now here first we call our asyncHandler fun and make it a high order fun and inside it we make our function that is async and then we will directly send response in json format with status code and message. */
const registerUser = asyncHandler( async (req, res)=>{
    // [a.] Get user details
    /* Here we are destructuring the object data that is coming from frontend. */
    const {fullName, email, username, password} = req.body
    // console.log("email:", email); //checking if the data is coming

    // [b.] Validation
    
    /* Since we have to check for all fields that if they are empty or not. So instead of writing every time if statement we can write this in another way given below.*/
    if (
        [fullName, email, username, password].some((fields)=> fields?.trim() === "" ) //So here trim function removes any extra spaces.
    ) {
        throw new ApiError(400, "All fields are required.")
    }
    
    if (! email.includes("@")) {
        throw new ApiError(400, "Please write correct email id !");
    }

    // [c.] Check if user exists or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    }) /* So here we wil check with either username or email but if we want to check for user existence by both username and email then we can use operators like and, or, nor by using $ sign. */

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists.");
    }
    
    // [d.] Check for images
    /* Here we are getting the path of a file. Because we know that we have told the multer that add the file in given destination as specified(in temp folder) so that's why we can get the path of file. */
    const avatarLocalPath = req.files?.avatar[0]?.path;
    /* here if we dont send coverImage then it will be undefined so here we cant use optional chaining. We will use another alternatve.
        const coverImageLocalPath = req.files?.coverImage[0]?.path;   */
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path; // So here we are checking if coverImage is present or not and then getting the path.
    }
    
    if (! avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.");
    }

    // [e.] Upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

    // Checking if avatar is uploaded successfully on cloudinary
    if (! avatar) {
        throw new ApiError(400, "Avatar file is required.");
    }

    // [f.] Creating user object and pass entries
    const user = await User.create({
        fullName,
        avatar: avatar.url, // Since avatar will get whole response so we will extract url only.
        coverImage: coverImage?.url || "", /* Since we have not put any restrictions on coverImage so it may be present or not. */
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

// **************************************************************************************************************************************************
// Making logic for USER LOGIN 
const loginUser = asyncHandler( async (req, res) => {
    // [a.] Get dta from request body and check for it
    const {email, username, password} = req.body;
    
    if (!username && !email) {
        throw new ApiError(400, "Username or Email is required.");
    }
    /* Ye tab ke liye hai jab hume ya to phir email ya username se login kar rhe hai.
    if (!(username || email)) {
        throw new ApiError(400, "Username or Email is required.");
    } */

    // [b.] Find the user if it is registered 
    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    
    if (!user) {
        throw new ApiError(404, "User is not registered.");
    }

    // [c.] Check password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials")
    }

    //[d.] Calling the method for generating acess and refresh tokens
    const {accessToken, refreshToken}  = await generateAccessAndRefreshTokens(user._id);

    // [e.] Send to user in cookies
    // Updating our user with refreshtoken and removing password and refreshtoken from the response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    // For cookie
    const options = {
        httpOnly: true,
        secure: true
    }
    // Returning response
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken /* Now here jab humne cookies mei set kar diye the accessToken and refreshToken to hum isme kyun bhj rhe hai. Yaha par hum vo case handle kar rhe hai jab user khud apni taraf se in tokens ko save karna chaha rha ho uska apna koi reason ho , vaise to ye good practice nhi hai lekin tab bhi. cookies to browser mein hi save ho rhe hai lekin hum ye response client ko de rhe hai islye hum yaha par bhi likh rhe hai. */
            },
            "User logged in successfully."
        )
    )
})

// **************************************************************************************************************************************************
// Making logic for USER LOGOUT
const logoutUser = asyncHandler(async(req, res) => {
    /* Here we are using 'findByIdAndUpdate' method. Instead of using 'findById' and then refreshToken delete and then save and validate before false karna padega to hum sidhe hi ye method use kar rhe hai jaha par hum pehle id de rhe hai fir refresh token ko update kar denge. Saath hi mei hum isme new true bhi kar skte hai jisse updated values aaye reponse mein.*/
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {refreshToken : undefined} /* This is the operator of mongodb to update and set something so we have pass in form of object that is refreshToken and set it to undefined. */
        },
        {
            new: true // In reponse we will get new updated value with refresh token undefined not the old one.
        }
    )

    // For removing cookies
    const options = {
        httpOnly: true,
        secure: true
    }
    
    // For clearing we have function from cookie-parser i.e. 'clearCookie()'
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200, {}, "User logged out successfully."))
})

// *************************************************************************************************************
// Making an endpoint to hit for refreshing refresh token
const refreshAccessToken =  asyncHandler(async (req, res) => {
    // Getting refresh tokens from user
    const incomingRefereshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (! incomingRefereshToken ) {
        throw new ApiError(401, "Unauthorised request !");
    }

    try {
        //  Verifying the refresh token
        const decodedToken = jwt.verify(incomingRefereshToken, process.env.REFRESH_TOKEN_SECRET);
        
        // Finding user 
        const user = await User.findById(decodedToken?._id);
        if (! user ) {
            throw new ApiError(401, "Invalid Refresh token !");
        }
    
        // Matching both the tokens
        if (incomingRefereshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used.");
        }
    
        // Generating refresh tokens
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        // Sending in cookies
        const options = {
            httpOnly: true,
            secure: true
        }
        
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token refreshed successfully"
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token ! ");
    }
})

export {
     registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken 
    };
