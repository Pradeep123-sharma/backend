// Now here we are also handling errors gracefully that which type or in format error should come. We are making this file so that is any error comes they should be standardized and come in same format.
// Now that node js provides us a error class and since we have studied classes and concept of inheritance so we can use the error class and we can override some methods so that error which are coming can  be controlled easily and come in same format.

// Now we are creating a class called error and we are inheriting the error class(by extends keyword) of node js.
class ApiError extends Error {
    // Now first we are making a constructor which should provide us following parameters
    constructor(
        statusCode, // status code of the error
        message = "Something went wrong", // if no message is provided then it will be default
        error = [], // if there are many error then it should be in array
        stack = "" // if we want to see the stack trace then we can see it here
    ){
        // Now we will override the constructor of the error class
        super(message);
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.error = error

        // Now here we will write some code for stackTrace. Stack trace is nothing but a stack which shows in which files and lines error has come so that any backend engineer can easily identify it.
        /* now below is the code that if stackTrace is provided then it will show otherwise it will capture the stack trace and where we will pass: 
        1. current object that we have created (ApiError)
        2. current function that we are in (constructor)
        The below code is optional.
         */
        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}