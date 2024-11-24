const User=require("../models/User");
const mailSender=require("../utils/mailSender");
const crypto=require("crypto");
const bcrypt=require("bcrypt");

//reset password token
exports.resetPasswordToken = async (req,res)=>{
    try{
        const {email}=req.body;
        const user=await User.findOne({email:email});
        if(!user){
            return res.status(401).json({
                success:false,
                message:"User is not registered"
            })
        };

        //generate token
        const token=crypto.randomUUID();        //cryptographically secure random number generator.
        //It uses a secure source of randomness, making it less predictable than using Math.random() or other random libraries.
        //It returns a randomly generated 36-character string that looks like: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const updatedDetails=await User.findOneAndUpdate({
                                        email:email}, 
                                        {
                                            token:token,
                                            resetPasswordExpires:Date.now()+5*60*1000
                                        }, 
                                        {new:true});
        const url=`https://localhost:3000/update-password/${token}`;
        await mailSender(email,
                    "Reset your password",
                    `Click on this link to reset your password: ${url}`);
        
        return res.json({success:true, message:"Password reset link sent to your email"});
    }catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Something went wrong while sending reset mail"
        })
    }
};

//resetPassword
exports.resetPassword=async(req, res)=>{
    try{
        //data fetch
        const {password, confirmPassword, token}=req.body;
        if(password!==confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Password does not match"
            })
        }
        //get user detail from db using token
        const userDetails=await User.findOne({token:token});
        if(!userDetails){
            return res.status(401).json({
                success:false,
                message:"Token is invalid"
            })
        }
        //token time check
        if(!(userDetails.resetPasswordExpires>Date.now())){
            return res.status(401).json({
                success:false,
                message:"Token is expired, please regenerate token"
            })
        }
        //hash password
        const hashedPassword=await bcrypt.hash(password,10);
        //password update
        await User.findOneAndUpdate({token:token}, {password:hashedPassword}, {new:true});
        
        return res.status(200).json({
            success:true,
            message:"Password reset successfully"
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Something went wrong while resetting password"
        })
    }
}