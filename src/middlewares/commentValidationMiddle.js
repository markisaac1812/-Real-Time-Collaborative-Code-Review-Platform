import {
  validateCreateComment,
  validateUpdateComment,
} from "../validations/commnetValidation.js";
import AppError from "../utils/appError.js";

export const validateCreateComment = (req,res,next)=>{
    const {error,value} = validateCreateComment(req.body);
    
    if(error){
        const messages = error.details.map(detail => detail.message);
        return next(new AppError(`Validation Error: ${messages.join('; ')}`, 400));
    }
    
    req.body = value;
    next();
}

export const validateUpdateComment = (req,res,next)=>{
    const {error,value} = validateUpdateComment(req.body);
    
    if(error){
        const messages = error.details.map(detail => detail.message);
        return next(new AppError(`Validation Error: ${messages.join('; ')}`, 400));
    }
    
    req.body = value;
    next();
}