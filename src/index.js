import dotenv from "dotenv"
import { app } from "./app.js"

import connectDB from "./db/dbconnect.js";
dotenv.config({
    path: './.env'
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`Server is running on port: ${process.env.PORT}`);
    })
})
.catch((err) =>{
    console.log("MongoDB connection failed !!!",err);
})






























/* import express from "express";
const app = express();

Now generally if we use function then we write it as:
            function connectDB(){}
            connectDB();
Now this approach is better but better than this is below by using iife.

sometimes before using iife in professional work some use semicolon before it we do not put semicolon in the above line then problem can happen.

( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)//to connect we need connection string and db name
        
        //Now generraly if we import our app then sometimes app cannot interact with db,then
        app.on("error", (error)=>{
            console.log("Error:",error);
            throw error;
        })
        
        //If app is able to interact with db
        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("Error:", error);
        throw error;
    }
})() */