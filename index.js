import express from "express";
import http from "http"
import { Server as socketIo} from "socket.io"
import cors from "cors"
import helmet from "helmet";
import morgan from "morgan"
import rateLimit from "express-rate-limit";
import dotenv from "dotenv"
import connectDB from './config/database.js'
import router from "./routes/auth.routes.js";
dotenv.config({
  path:'./config.env'
})

const app = express()
const server = http.createServer(app)


//initialize socket
const io = new socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    Credential: true,
  },
  maxHttpBufferSize: 1e8 // 100 mb per audio chunk
})

// connect to db
connectDB()


app.use(helmet())
app.use(cors({
   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
}))
app.use(express.json({ limit: '50mb'}))
app.use(express.urlencoded({extended: true, limit: '50mb'}))
app.use(morgan('dev'))

//we are using the rate limiting here 
const limiter = rateLimit({
  windowMs: 15* 60*1000, // 15 mins
  max: 100
})

app.use('/api/', limiter)

//Routes
app.use("/api/v1",router)


//health check
app.get('/health', (req, res) => {
  res.json({status: 'OK', timeStamp: new Date().toISOString() });
})

app.use((err, req, res, next) => {
  console.log("Error", err)
  res.status(err.status || 500).json({
    message: err.message || "Internal server error ",
    ...(process.env.NODE_ENV === 'development' && { stack : err.stack})
  })
})





const PORT = process.env.PORT || 5000;

server.listen(PORT,() => {
  console.log(`🚀 server running on port ${PORT}`)
  console.log(` 📡 Websocket server ready`)
})

















