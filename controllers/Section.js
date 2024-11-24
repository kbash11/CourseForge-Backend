const Course=require('../models/Course');
const Section=require('../models/Section');

//create Section
exports.createSection = async(req,res)=>{
    try{
        //fetch data from req body
        const {sectionName,courseId}=req.body;
        //validate data
        if(!sectionName || !courseId){
            return res.status(403).json({
                success:false,
                message:"All fields are required"
            })
        };
        //create section
        const newSection=await Section.create({sectionName});
        //update course with section ID
        const updatedCourseDetails=await Course.findByIdAndUpdate(
                                        courseId,
                                        {
                                            $push:{
                                                courseContent:newSection._id
                                            }
                                        },
                                        {new:true}).populate("courseContent").exec();
        return res.status(200).json({
            success:true,
            message:"Section created successfully",
            updatedCourseDetails
        })
    }catch(err){
        console.log(err);
        return res.status(500).json({
            success:false,
            message:"Something went wrong while creating section"
        });
    }
};

//update a section
exports.updateSection=async(req,res)=>{
    try{
        //data fetch
        const {sectionName, sectionId}=req.body;
        //validation
        if(!sectionName ||!sectionId){
            return res.status(403).json({
                success:false,
                message:"All fields are required"
            })
        };
        //update data
        const updatedSection=await Section.findByIdAndUpdate(sectionId,{sectionName},{new:true});
        return res.status(200).json({
            success:true,
            message:"Section updated successfully",
            updatedSection
        })
    }catch(err){
        console.log(err);
        return res.status(500).json({
            success:false,
            message:"Something went wrong while updating section"
        });
    }
};

//delete section
exports.deleteSection=async(req, res)=>{
    try{
        //get ID - assuming that we are passing ID in params
        const {sectionId}=req.body;
        //delete section
        await Section.findByIdAndDelete(sectionId);

        // H.W - do we need to delete the entry from course
        
        return res.status(200).json({
            success:true,
            message:"Section deleted successfully"
        })
    }catch(err){
        console.log(err);
        return res.status(500).json({
            success:false,
            message:"Something went wrong while deleting section"
        });
    }
};
