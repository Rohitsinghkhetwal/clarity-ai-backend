import mongoose from "mongoose";

const connectDB = async() => {
  try {
    await mongoose.connect(process.env.MONGO_URL,{
      useNewUrlParser : true,
      useUnifiedTopology: true,
    })

    console.log("✅ MongoDB Connected")

  }catch(err) {
    console.error("Mongodb Connection error ", err)
    process.exit(1);

  }

}

export default connectDB;