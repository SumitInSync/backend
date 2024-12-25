import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCoudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"



const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user =  await User.findById(userId)
        const refreshToken =  user.generateRefreshToken()
        const accessToken = user.generateAccessToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        
        return {accessToken,refreshToken} 

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access tokens")
    }
}


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
});


const loginUser = asyncHandler( async (req,res) => {
    // get user details from frontend (or from postman) [re body -> data]
    // username or email
    // find the user 
    // password Check
    // acess and refresh token
    // send cookies


    const {email,username,password} = req.body;

    if(!email || !username){
        throw new ApiError(400,"Email or Username is required")
    }
    
    const user =  await User.findOne({
        $or : [{email} , {username}]
    }) 

    if(!user){
        throw new ApiError(400,"User does not exist");
    }

    const isPasswordValid =  await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(400,"password is incorrect");
    }

    const {accessToken,refreshToken} =  await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken" )

    const options = {
        httpsOnly : true,
        secure : true,
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
            },
            "User Logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpsOnly : true,
        secure : true,
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{} . "User logged out"))

})

 


export {registerUser , loginUser,logoutUser} 