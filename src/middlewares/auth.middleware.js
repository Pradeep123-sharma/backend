import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _ , next) => {
    try {
        /* => We are accessing cookies by request and we had also use optional chaining because maybe user had send the token through header. 
           => User header se jab token bhejta hai vo "Authorization" mein bhejta hai, jiski value 'Bearer <token>'(Access token).
           => To humne js ke 'replace' method ka use karke "Bearer (space)" ko "" mein convert kar diya. */    
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
            throw new ApiError(403, "Unauthorised request");
        }
    
        /* => Verifying that if token is correct or not. 
           => Now humne accessToken mein username, email, id, fullname bheja tha vaise to usually id hi bhejte hai to hume usko vapas decode bhi karna hoga.
           => So, jwt have a method 'verify' where we have passed the token and the token secret because it can be decoded when we have secret also.
           => Yha par await bhi laga skte hai. */
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password, -refreshToken");
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        // Now we will finally add user to req object
        req.user= user;
        
        next();

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
})
/* Now we have written the code of middleware so we will use this middleware in routes. */