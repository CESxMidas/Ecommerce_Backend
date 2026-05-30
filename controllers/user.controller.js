import bcrypt from "bcryptjs";

import UserModel from "../models/user.model.js";
import AddressModel from "../models/address.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatProfile, formatAddress } from "../utils/formatters.js";
import { ApiError } from "../utils/apiError.js";

export const updateProfile = asyncHandler(async (request, response) => {
  const { name, email, phone } = request.body;
  const user = request.user;

  if (name?.trim()) {
    user.name = name.trim();
  }

  if (phone !== undefined) {
    user.mobile = String(phone).trim();
  }

  if (email?.trim() && email.trim().toLowerCase() !== user.email) {
    const exists = await UserModel.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: user._id },
    });

    if (exists) {
      throw new ApiError(409, "Email already in use");
    }

    user.email = email.trim().toLowerCase();
  }

  await user.save();

  response.json(formatProfile(user));
});

export const changePassword = asyncHandler(async (request, response) => {
  const { password, confirmPassword, currentPassword } = request.body;

  if (!password || password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const user = await UserModel.findById(request.user._id).select("+password");

  if (currentPassword) {
    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      throw new ApiError(400, "Current password is incorrect");
    }
  }

  user.password = await bcrypt.hash(password, 10);
  await user.save();

  response.json({ message: "Password changed successfully" });
});

export const getAddresses = asyncHandler(async (request, response) => {
  const addresses = await AddressModel.find({
    userId: request.user._id,
    status: true,
  }).sort({ createdAt: -1 });

  response.json(addresses.map(formatAddress));
});

export const createAddress = asyncHandler(async (request, response) => {
  const { address_line, city, state, pincode, country, mobile } =
    request.body;

  if (!address_line?.trim() || !city?.trim()) {
    throw new ApiError(400, "Address line and city are required");
  }

  const address = await AddressModel.create({
    userId: request.user._id,
    address_line: address_line.trim(),
    city: city.trim(),
    state: state?.trim() || "",
    pincode: pincode?.trim() || "",
    country: country?.trim() || "",
    mobile: mobile?.trim() || request.user.mobile || "",
  });

  response.status(201).json(formatAddress(address));
});

export const updateAddress = asyncHandler(async (request, response) => {
  const address = await AddressModel.findOneAndUpdate(
    { _id: request.params.id, userId: request.user._id },
    request.body,
    { new: true },
  );

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  response.json(formatAddress(address));
});

export const deleteAddress = asyncHandler(async (request, response) => {
  const address = await AddressModel.findOneAndUpdate(
    { _id: request.params.id, userId: request.user._id },
    { status: false },
    { new: true },
  );

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  response.json({ message: "Address removed" });
});
