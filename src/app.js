import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// routes
import userRouter from "./router/user.routes.js";
import healthcheckRouter from "./router/healthcheck.routes.js";
import tweetRouter from "./router/tweet.routes.js";
import subscriptionRouter from "./router/subscription.routes.js";
import videoRouter from "./router/video.routes.js";
import commentRouter from "./router/comment.routes.js";
import likeRouter from "./router/like.routes.js";
import playlistRouter from "./router/playlist.routes.js";
import dashboardRouter from "./router/dashboard.routes.js";

//routes declaration
  app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export { app };
