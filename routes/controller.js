const { UserAccount, Otp } = require('../models/index');
const axios = require('axios').default;

async function deliverOtp(
    phoneNumber,
    OTP,
    messageObj,
  ) {
    if (!process.env['sendOtps']) {
      console.log('Faking OTP sending', { phoneNumber, OTP });
      return;
    }
    console.log('sending otp', messageObj);
    await axios.get(
      `https://http.myvfirst.com/smpp/sendsms?to=${phoneNumber}&from=CONCNT&text=${messageObj.message}&dlr-mask=19&dlr-url=https://conscent.in`,
      { headers: { Authorization: `Basic ${valuefirstAuthToken}` } },
    );
  };

module.exports = async function sendOtp({userAccount}) {
    //TODO: Need to add check for rate limiting OTPs
    // const previousOtps = await this.otpModel.count({
    //   ipAddress,
    //   createdAt: {
    //     $gte: moment()
    //       .subtract(10, 'minutes')
    //       .toDate(),
    //   },
    // });

    if (process.env['sendOtps'] && previousOtps >= 10) {
      throw new ConflictException('Too many OTP requests. Please try again in 10 minutes');
    }

    const code = Math.floor(1000 + Math.random() * 9000);
    const today = new Date();
    const otpExpiry = today.setMinutes(today.getMinutes() + 10);

    const messageObj = {
      message: `${code} is the OTP for your authentication on ConsCent, and is valid for 10 mins. Do not share your OTP, protect yourself from abuse.`,
      sender: 'CONCNT',
      phoneNumber: userAccount.phoneNumber,
      otp: code.toString(),
    };

    // if (clientId) {
    //   const client = await this.clientModel.findById(clientId).select('name');
    //   messageObj.message = `${code} is the OTP for your authentication on ConsCent (flagship brand of TSB Media Venture Pvt Ltd) for ${client.name}, and is valid for 10 mins. Do not share your OTP, protect yourself from abuse.`;
    // }

    await deliverOtp(userAccount.phoneNumber, code, messageObj);

    const newOtp = new Otp({ userAccount: userAccount.id, code, otpExpiry, 
       // ipAddress 
    });
    await newOtp.save();
    return {
      message: 'otp sent',
    };
}

