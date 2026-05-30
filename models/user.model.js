import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Provide name"],
    },

    email: {
      type: String,
      required: [true, "Provide email"],
      unique: true,
    },

    password: {
      type: String,
      select: false,
      default: null,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    avatar: {
      type: String,
      default: "",
    },

    mobile: {
      type: String,
      default: "",
    },
    verify_email: {
      type: Boolean,
      default: false,
    },

    last_login_date: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },

    address_details: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "address",
      },
    ],

    shopping_cart: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "cartProduct",
      },
    ],

    orderHistory: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "order",
      },
    ],

    forgot_password_otp: {
      type: String,
      default: null,
    },

    forgot_password_expiry: {
      type: Date,
      default: null,
    },

    role: {
      type: String,
      enum: ["ADMIN", "USER"],
      default: "USER",
    },
  },
  {
    timestamps: true,
  },
);

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
