import express from "express";
import app from "../api/index.js";

const server = express();
server.use(express.static("public"));
server.use(app);
server.listen(3000, () => console.log("http://localhost:3000"));
