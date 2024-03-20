import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const moneyUserSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: true,
            lowercase: true,
            required: true,
            trim: true,
            index: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            unique: true,
            lowercase: true,
            required: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        profilePicture: {
            type: String,
            required: true,
        },
        balance: {
            type: Number,
            default: 1000,
        },
        transactionHistory: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "MoneyTransaction",
                },
            ],
        },
        refreshToken: {
            type: String,
        },
    },
    { timestamps: true }
);

moneyUserSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } else {
        return next();
    }
});

moneyUserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

moneyUserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

moneyUserSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

moneyUserSchema.plugin(mongooseAggregatePaginate);

export const MoneyUser = mongoose.model("MoneyUser", moneyUserSchema);
