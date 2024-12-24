import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCoudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
const registerUser = asyncHandler(  async (req,res) => {
   // get user details from frontend (or from postman)
   // check validation -> not empty
   // check if user already exists: using username , email
   //  check for images, check for avatar
   // upload to cloudinary,avatar
   // create user object - create entry in db
   // remove password and refresh token field from response
   // check for user creation 
   // return res



    // get user details from frontend (or from postman)
   const {fullName,email,username,password}= req.body
    // console.log("Email : ",email)

    // check validation -> not empty::

    // if(fullName === ""){
    //     throw new ApiError(400, "fullName is required")
    // }
    // short-cut
    if(
        [fullName,email,username,password].some((field) => field?.trim() === "" )
    ){
        throw new ApiError(400, "All fields are required")
    }

    
    // check if user already exists: using username , email
    const existedUser = await User.findOne({
        $or : [{ username },{ email }]
    })
    
    if(existedUser){
        throw new ApiError(409,"User with email or Username Already Exists!")
    }
    // console.log(req.files)
    //  check for images, check for avatar
    const avatarLocalPath =  req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)  && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is Rquired")
    }

    // upload to cloudinary,avatar
    const avatar =  await uploadOnCoudinary(avatarLocalPath)
    const coverImage =  await uploadOnCoudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400,"Avatar file is Rquired")
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

   const createdUser =  await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser){
    throw new Api(500,"Something went wrong while registering a user")
   }

   // return res
   return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered Successfully")
   )
})

 


export {registerUser} 