import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { MoneyUser } from "../models/user.model.js";

const generateAccessAndRefreshToken = async (id) => {
    const user = await MoneyUser.findById(id);
    if (!user) {
        throw new ApiError(500, "Could not find user");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
    const { username, fullName, email, password } = req.body;
    const localFilePath = req.file?.path;

    if (
        [username, fullName, email, password].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    if (!localFilePath) {
        throw new ApiError(400, "Profile picture is required");
    }

    const isPresent = await MoneyUser.findOne({
        $or: [{ username }, { email }],
    });

    if (isPresent) {
        throw new ApiError(
            400,
            "Provided Username/Email has already been taken"
        );
    }

    const profilePicturePath = await uploadOnCloudinary(localFilePath);

    if (!profilePicturePath.url) {
        throw new ApiError(
            500,
            "Could not upload the profile picture on cloudinary"
        );
    }

    const user = await MoneyUser.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        fullName,
        password,
        profilePicture: profilePicturePath.url,
    });

    if (!user) {
        throw new ApiError(500, "Could not register the user");
    }

    const newUser = await MoneyUser.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(200)
        .json(new ApiResponse(200, newUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (
        !(email || username) ||
        (email && email.trim() === "") ||
        (username && username.trim() === "")
    ) {
        throw new ApiError(400, "Invalid Username/Email");
    }

    if (!password || password.trim() === "") {
        throw new ApiError(400, "Password is required");
    }

    const user = await MoneyUser.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(400, "User does not exists");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await MoneyUser.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!loggedInUser) {
        throw new ApiError(500, "Could not login the user");
    }

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        domain: "https://money-transfer-two.vercel.app",
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await MoneyUser.findByIdAndUpdate(
        req.user?._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const regenerateToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
        throw new ApiError(400, "Token not provided");
    }

    try {
        const decodedToken = jwt.verify(
            token,
            process.env.REFRESH_TOKEN_SECRET
        );
        if (!decodedToken) {
            throw new ApiError(400, "Invalid Token");
        }

        const user = await MoneyUser.findById(decodedToken._id);
        if (!user) {
            throw new ApiError(400, "User not found");
        }

        if (token !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user._id);

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            domain: "https://money-transfer-two.vercel.app",
        };

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Tokens regenerated"
                )
            );
    } catch (error) {
        throw new ApiError(400, "Error while regenerating tokens");
    }
});

const getUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User details sent successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (
        !oldPassword ||
        oldPassword.trim() === "" ||
        !newPassword ||
        newPassword.trim() === ""
    ) {
        throw new ApiError(400, "Both the passwords are required");
    }

    const user = await MoneyUser.findById(req.user?._id);
    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    const updatedUser = await MoneyUser.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!updatedUser) {
        throw new ApiError(500, "Could not find the user");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "Updated the user password successfully"
            )
        );
});

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName } = req.body;
    if (!fullName || fullName?.trim() === "") {
        throw new ApiError(400, "Full Name is required");
    }

    const user = await MoneyUser.findById(req.user?._id);
    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const updatedUser = await MoneyUser.findByIdAndUpdate(
        user._id,
        { fullName },
        { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(500, "Could not update the user details");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "Updated user details successfully"
            )
        );
});

const updateUserProfilePicture = asyncHandler(async (req, res) => {
    const localFilePath = req.file?.path;
    if (!localFilePath) {
        throw new ApiError(400, "Profile picture is required");
    }

    const user = await MoneyUser.findById(req.user?._id);
    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const profilePicturePath = await uploadOnCloudinary(localFilePath);
    if (!profilePicturePath.url) {
        throw new ApiError(
            500,
            "Could not upload the profile picture on cloudinary"
        );
    }

    const updatedUser = await MoneyUser.findByIdAndUpdate(
        user._id,
        { profilePicture: profilePicturePath.url },
        { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(500, "Could not update the user profile picture");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "Updated the user profile picture successfully"
            )
        );
});

const getTransactionHistory = asyncHandler(async (req, res) => {
    const id = req.user?._id;
    let { page = 1, limit = 10 } = req.query;

    if (!page || page < 1) {
        page = 1;
    }
    if (!limit || limit < 1) {
        limit = 10;
    }

    const start = (page - 1) * limit;

    const user = await MoneyUser.findById(id);
    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const userId = req.user._id;

    const transactionHistory = await MoneyUser.aggregate([
        {
            $match: { _id: userId },
        },
        {
            $lookup: {
                from: "moneytransactions",
                let: { userId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ["$from", "$$userId"] },
                                    { $eq: ["$to", "$$userId"] },
                                ],
                            },
                        },
                    },
                    {
                        $sort: {
                            createdAt: -1,
                        },
                    },
                ],
                as: "transactionHistory",
            },
        },
        {
            $project: {
                password: 0,
                refreshToken: 0,
            },
        },
        {
            $skip: start,
        },
        {
            $limit: limit,
        },
    ]);

    if (!transactionHistory.length) {
        return new ApiResponse(200, {}, "No transactions to show");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                transactionHistory[0],
                "Fetched the transaction history of the user"
            )
        );
});

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await MoneyUser.find().select(
        "-password -refreshToken -balance -transactionHistory -createdAt -updatedAt -__v"
    );

    if (!users || users.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "No users to show"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, users, "Fetched users successfully"));
});

export {
    registerUser,
    loginUser,
    regenerateToken,
    logoutUser,
    getUser,
    changePassword,
    updateUserDetails,
    updateUserProfilePicture,
    getTransactionHistory,
    getAllUsers,
};
