import multer from "multer";

const storage = multer.diskStorage({
    /* in destination, there is a function in which :
        1.req is request that is coming from user weather it is in json form
        2.file is the main in multer because when any user pass any files in request so that's why multer or express-file-uploader is used.
        3. cb is a callback function.*/
    destination: function(req, file, cb) {
        
        /* So here callback uses other parameters also first is for error handling and second is the destination of file. */
        cb(null, "./public/temp")
    },
    filename: function(req, file, cb) {
        
        /* now here we will pass filename. here there are some strictness that filename should be unique id, nanoid, unique suffix etc. 
        It is not good practice that filenames should be save as originalname because maybe user has several files of same name but this operation is of very less time so it does not matter as much.
        Otherwise you can also write like this:-
            cb(null, file.fieldname + '-' + uniqueSuffix)
        This is nothing but adding some random number to file and some signs and symbols. */
        cb(null, file.originalname);
    }
})

/* To kyunki hum callback mei filename de rhe hai to vo localFilePath mei pura file path aa jayega. ./public/temp karke fir filename aa jayega . */

export const upload = multer({
    storage,
})