import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: "https://money-transfer-two.vercel.app",
        credentials: true,
    })
);

app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" })); // from json
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // from url
app.use(express.static("public")); // static files like pdf, image to store in temp
app.use(cookieParser()); // for secure CRUD operations from server to browser

// importing routes
import userRouter from "./routes/user.route.js";
import transactionRouter from "./routes/transaction.route.js";
import healthRouter from "./routes/health.route.js";
// declaring routes
app.use("/api/v2/users", userRouter);
app.use("/api/v2/transactions", transactionRouter);
app.use("/api/v2/health", healthRouter);
export { app };
