import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({limit: "50mb", extended: true}));

app.use(express.static("public"));
app.use(cookieParser());


// Routes import - We import here because of segregation and cleaner code.
import userRouter from "./routes/user.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import commentRouter from  "./routes/comment.routes.js"

// Declaring routes
// The best practice is that if we are using APIs then define it and also the version.
app.use("/api/v1/users", userRouter); //here first we will write the routes and second is that where we are activating the router.
/* So here how the url is formed is: "http://localhost:8000/api/v1/users/register"
as we go to /users then control will go to userRouter and if we had write the correct route then it will go to /register and if we type it then only it will call registerUser function and then statuscode with message is displayed.*/

app.use("/api/v1/subscriptions", subscriptionRouter)

app.use("/api/v1/videos", videoRouter)

app.use("/api/v1/likes", likeRouter)

app.use("/api/v1/playlists", playlistRouter)

app.use("/api/v1/comments", commentRouter)

export { app };
