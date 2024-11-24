const User=require('../models/User');
const OTP=require('../models/OTP');
const otpGenerator=require('otp-generator');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
require('dotenv').config();

//Authentication in the controller makes sense because the controller is responsible for processing the incoming request, 
//interacting with the database to validate credentials, and generating the token/session.

//SEND OTP
exports.sendOTP=async(req,res)=>{
    try{
        const {email}=req.body;
        const checkUser=await User.findOne({email});
        if(checkUser){
            return res.status(401).json({
                success:false,
                message:"User already registered"
            })
        }
        let otp= otpGenerator.generate(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false
        });
        let checkUniqueOTP=await OTP.findOne({otp:otp});
        while(checkUniqueOTP){   // this logic is not good as we are checking again and again until we found the unique OTP
            otp= otpGenerator.generate(6,{
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false
            });
            checkUniqueOTP=await OTP.findOne({otp:otp});
        }
        const payLoad={email,otp};
        const otpBody=await OTP.create(payLoad);
        console.log(otpBody);
        res.status(200).json({
            success:true,
            message:"OTP sent successfully",
            otp
        });
    }catch(error){
        console.log(error,"error in sending OTP");
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }
};

//SignUp
exports.signUp=async(req,res)=>{
    try{
        //fetch data from req body
        const {firstName,lastName,email,password,confirmPassword,accountType,contactNumber,otp}=req.body;
        //validate data
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(403).json({
                success:false,
                message:"All fields are required"
            })
        };
        if(password!==confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Password and Confirm Password do not match"
            })
        };
        const checkUser=await User.findOne({email});
        if(checkUser){
            return res.status(400).json({
                success:false,
                message:"User already registered"
            })
        };
        //find most recent Otp
        const recentOtp=await OTP.find({email}).sort({createdAt:-1}).limit(1);
        console.log(recentOtp);
        //Validate OTP
        if(recentOtp.length===0){
            return res.status(400).json({
                success:false,
                message:"OTP not found"
            })
        }else if(otp!==recentOtp[0].otp){
            return res.status(400).json({
                success:false,
                message:"Invalid OTP"
            });
        }

        //Bcrypt uses salting when hashing passwords, meaning it adds a unique, 
        //random string to each password before hashing it. 
        //This ensures that even if two users have the same password, their hashed passwords will be different in the database.
        const hashedPassword=await bcrypt.hash(password,10);    // 10-rounds of password hashing

        // Create the user
		let approved = "";
		approved === "Instructor" ? (approved = false) : (approved = true);

        //entry create in db so that while creating or adding additional details we do not need to create new profile just about the previous profile
        const profileDetails=await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null
        });
        const user=await User.create({
            firstName,
            lastName,
            email,
            password:hashedPassword,
            accountType:accountType,
            contactNumber,
            approved:approved,
            additionalDetails:profileDetails._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        
        });
        return res.status(200).json({
            success:true,
            message:"User registered successfully",
            user
        });
    }catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"User cannot be registered. Please try again."
        });
    }
}

//login
exports.login=async(req, res)=>{
    try{
        //fetch data
        const {email,password}=req.body;
        // console.log(email,password);
        //validate data
        if(!email || !password){
            return res.status(403).json({
                success:false,
                message:"All fields are required"
            })
        }
        const user=await User.findOne({email}).populate("additionalDetails");
        if(!user){
            return res.status(400).json({
                success:false,
                message:"User is not registered"
            })
        };
        //password matching
        const passwordMatch=await bcrypt.compare(password,user.password);
        if(!passwordMatch){
            return res.status(403).json({
                success:false,
                message:"Incorrect Password"
            })
        }else{
            //generate JWT token
            const payload={
                email:user.email,
                id:user._id,
                accountType:user.accountType
            }
            const token=jwt.sign(payload,process.env.JWT_SECRET,{
                expiresIn:"24h"
            });
            
            user.token=token;
            user.password=undefined;
            
            const options={
                expires:new Date(Date.now()+3*24*60*60*1000),
                httpOnly:true       //cookie cannot be accessed via JavaScript in the browser, improving security
            }
            //create cookie and send response
            res.cookie("token",token,options).status(200).json({
                success:true,
                token,
                user,
                message:"User logged in successfully"
            })
        }

    }catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"login failure"
        })
    }
}

//Change password
exports.changePassword = async (req, res) => {
	try {
		// Get user data from req.user
		const userDetails = await User.findById(req.user.id);

		// Get old password, new password, and confirm new password from req.body
		const { oldPassword, newPassword, confirmNewPassword } = req.body;

		// Validate old password
		const isPasswordMatch = await bcrypt.compare(
			oldPassword,
			userDetails.password
		);
		if (!isPasswordMatch) {
			// If old password does not match, return a 401 (Unauthorized) error
			return res
				.status(401)
				.json({ success: false, message: "The password is incorrect" });
		}

		// Match new password and confirm new password
		if (newPassword !== confirmNewPassword) {
			// If new password and confirm new password do not match, return a 400 (Bad Request) error
			return res.status(400).json({
				success: false,
				message: "The password and confirm password does not match",
			});
		}

		// Update password
		const encryptedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUserDetails = await User.findByIdAndUpdate(
			req.user.id,
			{ password: encryptedPassword },
			{ new: true }
		);

		// Send notification email
		try {
			const emailResponse = await mailSender(
				updatedUserDetails.email,
				passwordUpdated(
					updatedUserDetails.email,
					`Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
				)
			);
			console.log("Email sent successfully:", emailResponse.response);
		} catch (error) {
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
		}

		// Return success response
		return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
	} catch (error) {
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
	}
};