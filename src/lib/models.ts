import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  userId: String,
  packageId: String,
  startDate: Date,
  endDate: Date,
  isSelfPickup: Boolean,
  location: String,
  deliveryTime: Object,
  priceBreakDown: Object,
  document: Array,
  address: Object,
});

const partnerSchema = new mongoose.Schema({
  name: String,
  city: String,
  status: String,
  location: Object,
});

export const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema, "bookings");
export const Partner = mongoose.models.Partner || mongoose.model("Partner", partnerSchema, "partners");
