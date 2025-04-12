// Now here we are also standardizing the response. Now for response there is no as such class in node js and express.
class ApiResponse {
    constructor(statusCode, message = "Success", data){
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode < 400; /* So here we will check that status code should be less than 400 because it is response. Staus code more than 400 are error codes.
        
        Statuscode indicate whether a specific HTTP request has been successfully completed .Responses are grouped in five classes:
        1.Informational responses (100 – 199)
        2.Successful responses (200 – 299)
        3.Redirection messages (300 – 399)
        4.Client error responses (400 – 499)
        5.Server error responses (500 – 599) 
        study more in mdn web docs
        */
    }
}

export {ApiResponse}
