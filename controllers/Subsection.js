const Section=require('../models/Section');
const Subsection=require('../models/SubSection');
const {uploadImageToCloudinary}=require('../utils/imageUploader');
require('dotenv').config();

//create Subsection
exports.createSubsection=async(req,res)=>{
    try{
        const {title, timeDuration, description, sectionId}=req.body;
        const video = req.files.videoFile;
        //validation
        if(!title || !timeDuration || !description || !sectionId || !video){
            return res.status(400).json({
                success:false,
                message:"All fields are required"
            })
        }
        console.log("video: " + video);
        //upload video to cloudinary
        const uploadDetails=await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
        console.log("uploaded"+uploadDetails);
        //create subsection
        const SubsectionDetails=await Subsection.create({
            title:title,
            timeDuration:timeDuration,
            description:description,
            videoUrl:uploadDetails.secure_url
        });
        console.log(SubsectionDetails);
        //update section with this subsection
        const updatedSection=await Section.findByIdAndUpdate({_id:sectionId}, {
            $push:{
                subSection:SubsectionDetails._id
            }
        }, {new:true});
        return res.status(200).json({
            success:true,
            message:"Subsection created successfully",
            updatedSection
        })
    }catch(error){
        return res.status(500).json({
            success:false,
            message:error.message
        }) 
    }
};

//update subsection
exports.updateSubsection=async(req,res)=>{
    try{
        const {title, timeDuration, description, subsectionId}=req.body;
        const video = req.files.videoFile;
        //validation
        if(!title ||!timeDuration ||!description ||!subsectionId){
            return res.status(400).json({
                success:false,
                message:"All fields are required"
            })
        }
        //upload video to cloudinary
        if(video){
            const uploadDetails=await uploadVideoToCloudinary(video, process.env.FOLDER_NAME);
            //update subsection
            const updatedSubsection=await Subsection.findByIdAndUpdate({_id:subsectionId}, {
                title:title,
                timeDuration:timeDuration,
                description:description,
                videoUrl:uploadDetails.secure_url
            }, {new:true});
            return res.status(200).json({
                success:true,
                message:"Subsection updated successfully",
                updatedSubsection
            })
        }
    }catch{
        return res.status(500).json({
            success:false,
            message:"Unable to update Subsection, please try again"
        })
    }
};

//delete subsection
exports.deleteSubsection=async(req, res)=>{
    try{
        const {subsectionId}=req.params;
        //delete subsection
        await Subsection.findByIdAndDelete({_id:subsectionId});
        return res.status(200).json({
            success:true,
            message:"Subsection deleted successfully"
        })
    }catch{
        return res.status(500).json({
            success:false,
            message:"Unable to delete Subsection, please try again"
        })
    }
}; 
