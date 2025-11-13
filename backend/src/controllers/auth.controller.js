import User from "../models/user.model.js";
import bcrypt from 'bcryptjs'
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";
import { redis } from "../lib/redis.js";
import { transporter } from "../config/nodemailer.js";
import { otpEmailTemplate } from "../templates/otp.template.js";
import { sendTextBeeSMS } from "../lib/textbee.js";

function generateOTP() {
  return Math.floor( 100000 + Math.random() * 900000 ).toString()
}

export const sendOtp = async (req,res,next) => {
    try {
      const { email, name , mobileNumber , password, fcmToken} = req.body;
      
      if ( !email || !name || !mobileNumber || !password || !fcmToken){
        return res.status(400).json({ message: "All fields are required "});
      }

      if ( password.length < 4 ){
        return res.status(400).json({ message: "Password must be atleast 4 characters long"}) // add more robust checking later like checking for uniqueness
      }

      const existingUser = await User.findOne({ email })

      if( existingUser ){
        return res.status(400).json({ message: "User with Email already exists "})
      }

      const existingMobileNumber = await User.findOne({ mobileNumber })

      if ( existingMobileNumber && existingMobileNumber.isMobileNumberVerified ){
        return res.status(400).json({ message: "User with verified mobile number already exits"})
      } 
      const otp = generateOTP();

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const userPayLoad = {
        name,
        email,
        mobileNumber:mobileNumber,
        password:hashedPassword,
        fcmToken
      }

      await redis.set(`UserInfo:${email}`, JSON.stringify(userPayLoad) , "EX", 60 * 5 )
      await redis.set(`OTP:${email}`, otp, "EX" , 60 * 5 ) //valid for 5 min

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Verification code for society manager",//change the name later
          html: otpEmailTemplate(otp) 
        });
      } catch (error) {
        await redis.del(`UserInfo:${email}`);
        await redis.del(`OTP:${email}`);
        next(error)
      }
      return res.status(200).json({ message: "OTP sent successfully"})
    } catch (error) {     
      next(error)
    }
}

export const verifyOTP = async (req,res,next) => {
  try {
    const { email, otp } = req.body;

    if ( !email || !otp ){
      return res.status(400).json({ message: "All fields are required "})
    }

    const storedOtp = await redis.get(`OTP:${email}`)
    const userData = JSON.parse( await redis.get(`UserInfo:${email}`))

    if (!storedOtp || !userData){
      return res.status(400).json({ message: "OTP and data expired or not found"})
    }

    if( storedOtp !== otp.toString() ){
      return res.status(400).json({ message: "Invalid OTP "})
    }

    const newUser = new User(userData)
    
    if (newUser) {
      await newUser.save();
      const token = generateToken(newUser._id, res);
     

      await redis.del(`UserInfo:${email}`);
      await redis.del(`OTP:${email}`);

      res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        profilePic: newUser.profilePic,
        mobileNumber: newUser.mobileNumber,
        isMobileNumberVerified: newUser.isMobileNumberVerified,
        role: newUser.role,
        token
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    next(error)
  }
}


export const login = async (req, res) => {
    const { email, password} = req.body;

    try {
        
        const user= await User.findOne({email});

        if(!user){
            return res.status(400).json({message: "User with the email does not exist"});
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if(!isPasswordCorrect){
            return res.status(400).json({message: "Invalid credentials"});
        }


        const token = generateToken(user._id, res);
        
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            description: user.description,
            profilePic: user.profilePic,
            mobileNumber: user.mobileNumber,
            isMobileNumberVerified: user.isMobileNumberVerified,
            role: user.role,
            token
        });
    } catch (error) {
        console.log("Error in login:", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }

}

export const logout = async (req, res) => {
    try {
        res.cookie("jwt", "",{ maxAge:0});
        res.status(200).json({message: "User logged out successfully"});    
    } catch (error) {
        console.log("Error in logout:", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
}

export const checkAuth = (req, res) => {
  try {
    if(!req.user){
      return res.status(401).json({message : "unauthorized access"});
    }  
    return res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const { profilePic, description , name , mobileNumber} = req.body;
    const userId = req.user._id;

    if (!profilePic && !description && !name && !mobileNumber) {
      return res.status(400).json({ message: "Please provide atleast one field" });
    }

    const updateData = {};

    // Handle profile picture upload
    if (profilePic) {
      const uploadedResponse = await cloudinary.uploader.upload(profilePic);
      updateData.profilePic = uploadedResponse.secure_url;
    }

    // Handle description update
    if (description) {
      updateData.description = description;
    }

    if (name) {
      updateData.name = name;
    }

    if (mobileNumber && mobileNumber.length == 10 && ! isNaN(mobileNumber) ){
      const existingMobileNumber = await User.findOne({ mobileNumber })

      if( existingMobileNumber && existingMobileNumber.isMobileNumberVerified ){
        return res.status(401).json({ message: "Verified User with this mobile number already exists"})
      }
      updateData.mobileNumber = mobileNumber
    }

    // Update user in the database
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      description: updatedUser.description,
      profilePic: updatedUser.profilePic,
      mobileNumber: updatedUser.mobileNumber,
      isMobileNumberVerified: updatedUser.isMobileNumberVerified,
      role: updatedUser.role
    });
  } catch (error) {
    console.error("Error in updateProfile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getOTPForMobileNumber = async (req,res,next) => {
  try {
    const { user } = req

    if ( user.isMobileNumberVerified){
      return res.status(400).json({ message: "mobile number already verified "})
    }

    const otp = generateOTP();//already a string

    await redis.set(`MOBILE_OTP:${user._id}`,otp, "EX" , 60 * 5 )

    try {
      await sendTextBeeSMS(`+91${user.mobileNumber}`,`Your otp for society manager is ${otp}`)
    } catch (error) {
      await redis.del(`MOBILE_OTP:${user._id}`)
      next(error)
    }

    return res.status(200).json({ message: "OTP send to mobile number "});
  } catch (error) {
    next(error)
  }
}

export const verifyMobileOTP  = async (req,res,next) => {
  try {
    const { otp } = req.body
    const { user } = req

    const storedOtp = await redis.get(`MOBILE_OTP:${user._id}`)

    if(!storedOtp){
      return res.status(400).json({ message: "OTP expired or invalid" })
    }

    if( storedOtp !== otp.toString()){
      return res.status(400).json({ message: "Incorrect OTP" })
    }

    await User.findByIdAndUpdate( user._id , { isMobileNumberVerified: true });

    await redis.del(`MOBILE_OTP:${user._id}`)

    return res.status(200).json({ message: "Mobile number verified successfully"})  
  } catch (error) {
    next(error)
  }
}

export const updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user._id;

    if (!fcmToken) return res.status(400).json({ message: 'FCM token required' });

    await User.findByIdAndUpdate(userId, { fcmToken });
    res.status(200).json({ message: 'FCM token saved successfully' });
  } catch (error) {
    next(error)
  }
};
