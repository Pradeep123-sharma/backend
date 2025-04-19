// Here we are directly importing mongoose and its schema so that we don't have to write mongoose.Schema.
import mongoose, {Schema} from "mongoose";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true, /* It is used if we want to make any field searchable in more optimized way. It is optional. It also affects performance so use it wisely.*/
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // Cloudinary url because 3rd party services provides us url of that image, video or file so that we can use it.
            required: true,
        },
        coverImage: {
            type: String, //Clodinary Url
        },
        watchHistory: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Video"
                }
        ],
        password: {
            type: String,
            required: [true, 'Password is required.']
        },
        refreshToken: {
            type: String
        },
    },
    {
        timestamps: true
    }
)

/* Since it takes time because we are working with db so we use async/await fun.
Also since it is middleware so we will pass next parameter as a flag. */
userSchema.pre("save", async function (next) {
    
    /* Now we have written this if code because if we don't write it then if we make any changes to user data then every time it will encrypt password , so we don't want this to happen. So here we had put a condition that if password is not changed then we don't encrypt it. */
    if (! this.isModified("password")) {
        return next();
    }

    /* Now since to encrypt passwrd we use bcrypt.hash and it takes 2 parameters 1 is password and 2 is salt round. Here we will give number of rounds the hashing algo is applied to make passwords more secure(but slower to compute).They make each hash unique even if 2 users have same password and slow down brute-force attacks. */
    this.password = bcrypt.hash(this.password, 10);
    next();
})

// Custom method
userSchema.methods.isPasswordCorrect = async function (password) {
    /* Through bcrypt we can also check passwords by compare method and returns true or false. It takes 2 parameters :1.password in string and 2. is encrypted password
    Since it takes time so we will use async await. */
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function() {
    // .sign method is used to generate tokens. It uses parameters like payload or data, access token secret and expiry
    jwt.sign(
        {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)
