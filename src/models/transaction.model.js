import mongoose from "mongoose";

const detailsSchema = new mongoose.Schema({
    senderUsername: {
        type: String,
    },
    senderProfilePicture: {
        type: String,
    },
    receiverUsername: {
        type: String,
    },
    receiverProfilePicture: {
        type: String,
    },
});

const moneyTransactionSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MoneyUser",
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MoneyUser",
        },
        amount: {
            type: Number,
            required: true,
        },
        message: {
            type: String,
        },
        participantsDetails: detailsSchema,
    },
    { timestamps: true }
);

export const MoneyTransaction = mongoose.model(
    "MoneyTransaction",
    moneyTransactionSchema
);
