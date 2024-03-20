import { ApiResponse } from "../utils/apiResponse.js";

export const check = async (req, res) => {
    return res.status(200).json(new ApiResponse(200, {}, "server is working"));
};
