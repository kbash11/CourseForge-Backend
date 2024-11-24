const {instance}=require('../config/razorpay');
const Course=require('../models/Course');
const User=require('../models/User');
const mailSender=require('../utils/mailSender');
const {courseEnrollmentEmail}=require('../mail/templates/courseEnrollmentEmail');
const mongoose=require('mongoose');

//capture the payment and initialize the razor pay 
exports.capturePayment=async(req,res)=>{
    //get course ID and UserId
    const {course_id}=req.body;
    const userId=req.user.id;
    //validation
    if(!course_id){
        return res.json({
            success:false,
            message:"Please provide a valid course ID"
        })
    };
    
    
    let course;
    try{
        course=await Course.findById(course_id);
        if(!course){
            return res.status(404).json({
                succes:false,
                message:"Course not found"
            });
        }

        //user already pay for the course
        const uid=new mongoose.Types.ObjectId(userId);
        if(course.studentsEnrolled.includes(uid)){
            return res.status(400).json({
                success:false,
                message:"Student is already enrolled"
            });
        }
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message
        });
    }
    //order create
    const totalAmount=course.price;
    const currency="INR";

    const options={
        amount:totalAmount*100,
        currency,
        receipt:Math.random(Date.now()).toString(),
        note:{
            courseId:course_id,
            userId
        }
    };

    try{
        //initial the payment
        const paymentResponse=await instance.orders.create(options);
        console.log(paymentResponse);

        return res.status(200).json({
            success:true,
            courseName:course.courseName,
            courseDescription:course.courseDescription,
            thumbnail:course.thumbnail,
            orderId:paymentResponse.id,
            currency:paymentResponse.currency,
            amount:paymentResponse.amount
        });
    }catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Could not initiate order"
        });
    }
};

//verify Signature of Razorpay and server
exports.verifySignature=async(req,res)=>{
    const webhookSecret="12345678";
    const signature=req.headers["x-razorpay-signature"];       //razorpay signature

    const shasum=crypto.createHmac("sha256",webhookSecret);
    //convert this HMAC object to string
    shasum.update(JSON.stringify(req.body));
    const digest=shasum.digest("hex");

    if(digest === signature){
        console.log("Payment is authorised");

        const {courseId, userId}=req.body.payload.payment.entity.notes;
        try{
            //fullfill action
            //find the course and enroll the student in it
            const enrolledCourse=await Course.findOneAndUpdate(
                                        {_id:courseId},
                                        {$push:{studentsEnrolled:userId}},
                                        {new:true}
            );
            if(!enrolledCourse){
                return res.status(500).json({
                    success:false,
                    message:"Course not found"
                });
            };
            //find the student and add course to their enrolled courses
            const enrolledStudent=await User.findOneAndUpdate(
                                {_id:userId},
                                {$push:{courses:courseId}},
                                {new:true}
            );

            //send confirmation mail
            const emailResponse=await mailSender(
                enrolledStudent.email,
                "Congratulation you are onboarded to this course",
                "congrats"
            );
            return res.status(200).json({
                success:true,
                message:"Signature verified and course added"
            });
        }catch{
            console.log(error);
            return res.status(500).json({
                success:false,
                message:error.message,
            })
        }
    }else{
        return res.status(400).json({
            success:false,
            message:"Invalid signature"
        });
    }
};

 