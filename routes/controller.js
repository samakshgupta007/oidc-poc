const { UserAccount, Otp } = require('../models/index');
const axios = require('axios').default;
const UAParser = require('ua-parser-js');

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

async function sendOtp({userAccount}) {
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

async function validateOtp({userAccount, OTP}) {
  // const { phoneNumber, email, OTP, sessionId, clientId } = authOTPCredentialsDto;
    // let userAccount;
    // if (phoneNumber) {
    //   userAccount = await this.userAccountModel.findOne({ phoneNumber });
    // } else if (email) {
    //   userAccount = await this.userAccountModel.findOne({ email: email.toLowerCase() });
    // }
    // if (!userAccount) {
    //   throw new ConflictException('Account does not exist. Please sign up');
    // }

    const today = new Date();
    const otp = await Otp.findOne({ userAccount: userAccount.id, status: 'UNVERIFIED', otpExpiry: { $gte: today } }).sort({ createdAt: -1 });

    if (!otp) {
      throw new Error('Invalid OTP');
    }
    if (today.getTime() >= otp.otpExpiry.getTime()) {
      throw new Error(`OTP Expired`);
    }

    if (OTP !== otp.code) {
      otp.retries = otp.retries + 1;
      await otp.save();
      if (otp.retries > 10) {
        throw new Error('Too many retries. Please request a new OTP');
      }
      // allow '1234' to pass as OTP in development
      if (process.env['sendOtps'] || OTP !== '1234') throw new Error('Invalid OTP');
    }

    // if (userAccount.status === 'PENDING') {
    //   userAccount.status = 'ACTIVE';
    // }
    // if (clientId) {
    //   userAccount.loggedInClients.push(clientId);
    // }
    // await userAccount.save();

    otp.status = 'VERIFIED';
    await otp.save();
    return; 
}

async function createUserAccount({
  userAgent,
  phoneNumber,
  email,
  ipAddress,
}) {
  const parser = new UAParser();
  parser.setUA(userAgent);
  const userAgentDetails = parser.getResult();
  //const { countryCode } = await this.detectCountry(ipAddress);
  const userAccount = new UserAccount({
    email: email ? email.toLowerCase() : undefined,
    phoneNumber: phoneNumber ? phoneNumber : undefined,
    status: 'PENDING',
    //country: countryCode,
    onBoardingDetails: {
      userAgent: userAgent,
      operatingSystem: userAgentDetails.os.name,
      browser: userAgentDetails.browser.name,
      ipAddress: ipAddress,
    },
  });
  await userAccount.save();
  return userAccount;
}

module.exports = { sendOtp, validateOtp, createUserAccount };