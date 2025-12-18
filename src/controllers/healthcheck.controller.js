import mongoose from "mongoose"
// import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message

    const mongoState  = mongoose.connection.readyState
    let databaseStatus = "unknown" 

    switch (mongoState) {
        case 0:
        databaseStatus = "Database Disconnected";
            break;
        case 1:
        databaseStatus = "Database connected";
            break;
        case 2:
        databaseStatus = "Database connecting";
            break;
        case 3:
        databaseStatus = "Database Disconnecting";
            break;    
    
        default:
        databaseStatus = "Database unknown";
            break;
    }

    const serverUptime = `${process.uptime().toFixed(2)} seconds`
    let message = "Health check passed"

    if (mongoState !== 1) {
        message += "but database connection is NOT established"
    }

     return res.status(200).json(
        new ApiResponse(
            200,
            {
                databaseStatus,
                serverUptime
            },
            message
        )
     )
})

export {
    healthcheck
    }
    
