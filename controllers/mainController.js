
const validate = require('validator');

var token = require('jsonwebtoken');

const _ = require('lodash');

const fs = require('fs');

var {db} = require('./../db/db.js');

const {Op}= require('./../db/db.js');

var Res = require('./../Response');


// const moment = require('moment');

var sKey=fs.readFileSync('./private.key');

var results_per_page;
// console.log(validate.toDate(null));

var login= (req,res)=>{
  var input = _.pick(req.body,['username','password']);
  input.verified=1;
  if(_.isEmpty(input.password) || _.isEmpty(input.username) ){
    return Res.badReq(res);
    }
    var temp =  db.User.generateAuth(input);
      temp.then(data=>{
        res.send(data);
      })

}

var generateAuth = (data)=>{
  return token.sign({
    exp: Math.floor(Date.now() / 1000) + (60 * 1000),
    data
  }, sKey);
};

var isLogin = (req,res,next) =>{
    token.verify(req.headers.token,sKey,(err,data)=>{
      if(data){
        console.log("Token Verified");
        req.body._id=data.data.id;
        req.body._name=data.data.name;
        res.basicInfo={name:data.data.name};
        next();
      }else{
        console.log("Not authorized");
        Res.notAuth(res,{tokenProvided:!_.isEmpty(req.headers.token)});
      }
    });

}

var playground = (req,res,next) =>{
  // db.User.findAll({
  //   include:[{
  //     model:db.customer,
  //     include:[{
  //       model:db.Policy,
  //       include:[
  //         {
  //           model:db.Installments
  //         }
  //       ],
  //     }],
  //   }]
  // }).then(d=>{
  //   res.send(d);
  // })


};

var updatePolicyStatus = (req,res,next)=>{
    db.Policy.findOne({
      attributes:['id','active_status'],
      where: {id:req.body.policy_id},
    }).then(data=>{
      var active_status = data.active_status ? 0 : 1;
      // console.log(active_status);
      db.Policy.update({active_status},{
        where: {id:req.body.policy_id},
      }).then(data=>{
        Res.success(res);
      });
    }).catch(e=>{
      Res.e400(res);
      // console.log(e,"hi");
    });
}

var getCustomers = (req,res,next)=>{
  db.customer.getAll(req,res,next).then(data=>{
    Res.success(res,{data,pagination:req.pagination});
  });
};

var addCustomer= (req,res,next)=> {
  var input = _.pick(req.body,['name','dob','email','mobile1','mobile2']);
  input.agent_id=req.body._id;
  db.customer.create(input).then(success=>{
      Res.success(res,{data:success});
  }).catch(e=>{
    if(e.name=='SequelizeValidationError'){
      Res.badReq(res,{validationError:true,errors:e.errors});
    }else{
      Res.e400(res);
    }
  //  res.send(e);
  });
//  res.send("hi");
};


var addPolicy = (req,res,next)=>{
   var input = _.pick(req.body,[
     'customer_id',
     'policy_number',
     'company_id',
     'branch_code',
     'plan_name',
     'term_duration',
     'mode',
     'issue_date',
     'date_of_commencement',
     'date_of_maturity',
     'total_installments',
     'premium_amount',
     'la_name',
     'first_due_date',
   ]);
   try{
    input.first_due_date= validate.toDate(input.first_due_date);
    input.issue_date= validate.toDate(input.issue_date);
    input.date_of_commencement = validate.toDate(input.date_of_commencement);
    input.date_of_maturity= validate.toDate(input.date_of_maturity);
   }catch(e){};

 db.Policy.create(input).then((data)=>{
   req.body._data=data;
   next();
 }).catch(e=>{
   if(e.name=="SequelizeValidationError"){
     Res.badReq(res,{errors:e.errors,validationError:true});
   }
 });

};

var getPolices = ()=>{
  db.Policy.findOne().then(d=>{
    res.send(d);
  });
}

var makeInstallments=(req,res,next)=>{
  var due_date=req.body._data.first_due_date;
  var policy_id=req.body._data.id;
  var mode=req.body._data.mode;
  var total_installments=req.body._data.total_installments;
  var emis=[];
  db.Modes.findOne({where:{id:mode}}).then(d=>{
    if(d.months){
      mode=d.months;
    }else{
      total_installments=1;
      mode=0;
    }
    //
    for(var i=0; i<total_installments; i++){
      emis.push({due_date,policy_id});
      due_date=addDate(due_date,mode);
    }
      // console.log(first_due_date);

      db.Installments.bulkCreate(emis).then(data=>{
        Res.success(res,{total_installments,policy_id,installment_dates:emis});
      }).catch(e=>{
        Res.e400()
      });
    //
  }).catch(e=>{
    Res.e400(res);
  })
// res.send(emis);

};

var addDate=(date,months)=>{
  var d=new Date(date);
  d.setMonth(d.getMonth()+months+1);
  return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();
}

var deleteCustomer=(req,res)=>{
  db.customer.update({is_deleted:true},{where:{id:req.body.customer_id}}).then(d=>{
    Res.success(res);
  }).catch(e=>{
    Res.e400(res);
  });
}

var updateCustomer = (req,res)=>{
  var input = _.pick(req.body,['name','dob','email','mobile1','mobile2']);
  input.agent_id=req.body._id;
  db.customer.update(input,{where:{id:req.body.customer_id}}).then(success=>{
      Res.success(res);
  }).catch(e=>{
    if(e.name=='SequelizeValidationError'){
      Res.badReq(res,{validationError:true,errors:e.errors});
    }else{
      Res.e400(res);
    }
  //  res.send(e);
  });
};

var updateCustomerStatus =(req,res)=>{
  db.customer.findOne({
    attributes:['id','active_status'],
    where: {id:req.body.customer_id},
  }).then(data=>{
    var active_status = data.active_status ? 0 : 1;
    // console.log(active_status);
    db.customer.update({active_status},{
      where: {id:req.body.customer_id},
    }).then(data=>{
      Res.success(res);
    });
  }).catch(e=>{
    Res.e400(res);
    // console.log(e,"hi");
  });
};

var policyInfo= (req,res,next)=>{
  db.Policy.findOne({
    attributes:{exclude:['createdAt','updatedAt','is_deleted']},
    where:{id:req.body.policy_id,
      is_deleted:false,
    },
    include:[{
      model:db.Installments
    }],
  }).then(data=>{
    var due_date;
    data.Installments.some(installment=>{

      if(installment.is_paid==null ||  installment.is_paid==false){
        due_date=installment.due_date;
        return true;

      }
    });

    Res.success(res,{data:data,upcoming_due_date:due_date});
  });
}

var payInstallment = (req,res,next)=>{
  db.Policy.findOne({
    where:{id:req.body.policy_id},
    attributes:['id'],
    include:[{
      model:db.Installments,
      where:{is_paid:false},
      limit:1,
    }],
  }).then(d=>{
    var id;
    if(_.isEmpty(d.Installments[0])){
      return   Res.badReq(res,{msg:"All installments are already paid"});
    }
    var id=d.Installments[0].id;
    db.Installments.update({is_paid:true,paid_at:getDate()},{
      where:{
        id
      }
    }).then(d=>{
        return Res.success(res,{msg:'Installment paid for policy number '+req.body.policy_id});
    }).catch(e=>{
      Res.e400(res);
    });

  });
}


var getDate=()=>{
  var date = new Date;
  var month=date.getMonth()+1;
  return `${date.getFullYear()}-${month}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

var fetchPolicies = (req,res,next)=>{
  var customer_id=req.body.customer_id;
  db.Policy.findAll({
    where:{customer_id,is_deleted:false},
    include:[{model:db.Installments}]
  }).then(data=>{
    Res.success(res,{data});
  }).catch(e=>{
    Res.e400(res);
  });

}

var deletePolicy = (req,res,next)=>{
  var id=req.body.policy_id;
  db.Policy.update({is_deleted:true},{
    where:{id}
  }).then(d=>{
    Res.success(res,{msg:'Policy deleted Successfully...!! '});
  }).catch(e=>{
    Res.e400(res);
  });
}

var updateUser = (req,res,next)=>{

  var input=_.pick(req.body,['username','name','email']);
  if(_.isEmpty(input.username) || _.isEmpty(input.name) || _.isEmpty(input.email)){
  return   Res.badReq(res,{msg:"Empty fields"});
  }
  db.User.findAndCount({
    where:{
      username:input.username,
      id:{
        [Op.ne]:req.body._id
      }
    }
  }).then(data=>{
    if(data.count){
      return Res.badReq(res,{msg:"Username already exists"});
    }
      update();
  }).catch(error=>{
    return Res.e400(res);
  })

var update =()=>{
  db.User.update({
    username:input.username,
    name:input.name,
    email:input.email
  },{
    where:{id:req.body._id}
  }).then(data=>{
    Res.success(res,{msg:"Profile updated Successfully...!!!!!!!!!!"},false);
  }).catch(e=>{
    if(e.name=='SequelizeValidationError'){
      Res.badReq(res,{validationError:true,errors:e.errors});
    }else{
      Res.badReq(res);
    }
  });
};
//
}

var userForgotPassword = (req,res,next)=>{
  var input=_.pick(req.body,['username']);
  if(_.isEmpty(input.username)){
    return Res.badReq(res,{msg:"Empty field"});
  }
  db.User.findOne({
    where:{username:input.username}
  }).then(data=>{
    if(_.isEmpty(data)){
        return Res.badReq(res,{msg:"Invalid Username"});
      }
        //creating token
        var webToken=token.sign({
          exp: Math.floor(Date.now() / 1000) + (60 * 15),
          data:data.id
        }, sKey);

        if(webToken){
          var otp =generateOtp();
          db.Otp.create({user_id:data.id,token:webToken,otp}).then(d=>{
            //sendMail()
            return Res.success(res,{msg:"A otp is generated for 15 mins ",session:webToken});
          })
        }else{
            return Res.e400(res);
        }

  }).catch(e=>{
      Res.e400(res);
  });
}

var generateOtp= (min=111111,max=999999)=>{
    return Math.floor(Math.random() * (max - min)) + min;
}

var userUpdatePassword = (req,res,next) =>{
  var id=req.body.otpInfo.user_id;
  var otpId=req.body.otpInfo.id;
  db.User.update({password:req.body.password},{
    where:{
      id
    }
  }).then(data=>{
    if(data){
      db.User.update({token:null},{
        where:{id}
      }).catch(err=>{});
      db.Otp.update({is_consumed:true},{
        where:{id:otpId}
      }).catch(err=>{});
      return Res.success(res,{msg:'Password Updated Successfully'});
    }else{
      return Res.badReq(res,{msg:"Unknown Error"});
    }
  }).catch(err=>{
    Res.e400(res);
  })

}

var userVerifyOtp = (req,res,next) =>{
  input=_.pick(req.body,['session','password','otp']);
  if(_.isEmpty(input.session) || _.isEmpty(input.password) || _.isEmpty(input.otp) ){
    return Res.badReq(res,{msg:'Empty Fields'});
  }
  // input.otp=parseInt(input.otp);
    db.Otp.findOne({
      where:{
        token:input.session,
        is_consumed:false
      }
    }).then(otpInfo=>{
      if(otpInfo){
        token.verify(input.session,sKey,(err,data)=>{
            if(err){
              return Res.badReq(res,{msg:'Otp Expired'});
            }
            if(otpInfo.otp==input.otp){
              req.body.otpInfo=otpInfo;
              next();
            }else{

              console.log(input.otp==otpInfo.otp);
              return Res.badReq(res,{msg:'Invalid Otp'});
            }

        });
      }else{
        Res.badReq(res,{msg:'Invalid Session'});
      }
    }).catch(err=>{

    });
}
///////
module.exports={
  login,
  isLogin,
  playground,
  updatePolicyStatus,
  getCustomers,
  addCustomer,
  addPolicy,
  makeInstallments,
  deleteCustomer,
  updateCustomer,
  updateCustomerStatus,
  policyInfo,
  payInstallment,
  fetchPolicies,
  deletePolicy,
  updateUser,
  userForgotPassword,
  userUpdatePassword,
  userVerifyOtp,
};
