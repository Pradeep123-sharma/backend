
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise
        .resolve(
            requestHandler(req, res, next)
        )
        .catch(
            (err)=> next(err)
        )
    }
}

export { asyncHandler }





/* This code is used when we are using try-catch syntax. */
//here we have do nothing but first take a function and inside it pass another funcion ab agar hume usey use karna hai to humne ek aur function liya hai aur usme pass kar diya hai bss

/*     const asyncHandler = (fn) => async (req, res, next) => {
        try {
            await fn(req, res, next)
        } catch (error) {
            
            res.status(error.code || 400).json({
                success: false,
                message: error.message
            })
        }
    } */