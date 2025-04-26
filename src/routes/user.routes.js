import {Router} from "express"
import { registerUser } from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/register").post(
        // Injecting Middleware
        /* Now since this upload comes from middleware so we get many options with upload. So to upload files we get '.single' but it uploads single file only. 
        We also cannot use '.array' because it stores elements in same datatype.
        So we will use '.fields' which accepts array and returns middleware with multiple associated files. */
        upload.fields([
                // So here we will take 2 files that are avatar and coverImage.so 2 objects.
                {
                        name: "avatar", // Name of file
                        maxCount: 1 //No. of files you accept
                },
                {
                        name: "coverImage",
                        maxCount: 1
                }
        ]),
        registerUser
)

/* Now the advantage of making such separate files is that suppose we have to write it for login so we don't need to import again and again users, we only have to write:
        router.route("login").post(login)
We don't need to write anything in app.js file.
So all the methods after the user are written here.*/

export default router