const { Decimal128, ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const UserAccountSchema = new mongoose.Schema(
  {
    phoneNumber: String,
    passwordHash: String,
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE'],
      default: 'PENDING',
    },
    dateOfBirth: Date,
    name: String,
    email: String,
    pincode: String,
    country: String,
    wallet: {
      balance: {
        type: Decimal128,
        default: 0,
      },
      currency: {
        type: String,
      },
    },
    lastPurchasedOn: Date,
    activeClients: {
      type: [{ type: ObjectId, ref: 'Client' }],
    },
    ampReaderIds: {
      type: [String],
    },
    onBoardingDetails: {
      userAgent: {
        type: String,
      },
      operatingSystem: {
        type: String,
      },
      browser: {
        type: String,
      },
      ipAddress: {
        type: String,
      },
      clientId: {
        type: ObjectId,
        ref: 'Client',
      },
    },
  },
  {
    timestamps: true,
  },
);

const UserAccount = mongoose.model('UserAccount', UserAccountSchema);

UserAccount.findAccount = (ctx, id, token) => {
  return UserAccount.findOne({phoneNumber: id});
}

module.exports = UserAccount; 