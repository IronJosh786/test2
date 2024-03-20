import { MoneyTransaction } from "../models/transaction.model.js";
import { MoneyUser } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const newTransaction = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    let commited = false;

    let { to, amount, message } = req.body;
    amount = parseInt(amount);

    if (req.user?.username === to) {
        throw new ApiError(400, "Cannot send to self");
    }

    try {
        const sender = await MoneyUser.findOne({
            _id: req.user?._id,
        }).session(session);
        const receiver = await MoneyUser.findOne({
            username: to,
        }).session(session);

        if (!sender || !receiver) {
            throw new Error("Sender or Receiver not found");
        }

        if (sender.balance < amount) {
            throw new Error("Insufficient funds");
        }

        // Update sender's balance
        sender.balance -= amount;
        await sender.save({ validateBeforeSave: false });

        // Update receiver's balance
        receiver.balance += amount;
        await receiver.save({ validateBeforeSave: false });

        const transaction = await MoneyTransaction.create(
            [
                {
                    from: sender._id,
                    to: receiver._id,
                    amount: amount,
                    message: message,
                    participantsDetails: {
                        senderUsername: sender.username,
                        senderProfilePicture: sender.profilePicture,
                        receiverUsername: receiver.username,
                        receiverProfilePicture: receiver.profilePicture,
                    },
                },
            ],
            { session: session }
        );

        if (!transaction) {
            throw new ApiError(500, "Could not complete the transaction");
        }
        await session.commitTransaction();
        commited = true;
        session.endSession();

        return res
            .status(200)
            .json(new ApiResponse(200, transaction, "Transaction successful"));
    } catch (error) {
        if (!commited) {
            await session.abortTransaction();
        }
        session.endSession();
        throw new ApiError(400, "Transaction failed", error);
    }
});

export { newTransaction };
