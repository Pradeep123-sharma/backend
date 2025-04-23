import { asyncHandler } from "../utils/asynchandler.js";


/* Now here first we call our asyncHandler fun and make it a high order fun and inside it we make our function that is async and then we will directly send response in json format with status code and message. */
const registerUser = asyncHandler( async (req, res)=>{
    res.status(200).json({
        message: "ok"
    })
} )

export { registerUser };
