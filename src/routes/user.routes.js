import {Router} from "express"
import { registerUser } from "../controllers/user.controller.js"

const router = Router()

router.route("/register").post(registerUser)

/* Now the advantage of making such separate files is that suppose we have to write it for login so we don't need to import again and again users, we only have to write:
        router.route("login").post(login)
We don't need to write anything in app.js file.
So all the methods after the user are written here.*/

export default router