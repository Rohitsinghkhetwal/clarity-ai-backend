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
import session from 'express-session';
import interviewRoute from "./routes/interview.routes.js"
import InterviewSocketHandler from "./websocket/interviewsocket.js";
import passport from "./config/passport.js"
dotenv.config({
  path:'./config.env'
})

const app = express()
const server = http.createServer(app)

console.log("this is the url ", process.env.FRONTEND_URL)


//initialize socket
const io = new socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    Credential: true,
  },
  maxHttpBufferSize: 1e8 // 100 mb per audio chunk
})

// connect to db
connectDB()



app.use(helmet())
app.use(cors({
   origin: process.env.FRONTEND_URL,
   methods: ['GET', 'POST','PUT', 'DELETE', 'OPTIONS'],
   credentials: true,
   allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json({ limit: '50mb'}))
app.use(express.urlencoded({extended: true, limit: '50mb'}))
app.use(morgan('dev'))
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize())
app.use(passport.session());


//we are using the rate limiting here 
const limiter = rateLimit({
  windowMs: 15* 60*1000, // 15 mins
  max: 100
})

app.use('/api', limiter)

//Routes
app.use("/api/auth",router)
app.use("/api/interview", interviewRoute)




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

const interviewSocket = new InterviewSocketHandler(io)
interviewSocket.initialize();
console.log(`Interview sockets handler are ready to go 🚀 `)


const PORT = process.env.PORT || 5000;

server.listen(PORT,() => {
  console.log(`🚀 server running on port ${PORT}`)
  console.log(` 📡 Websocket server ready`)
})

















