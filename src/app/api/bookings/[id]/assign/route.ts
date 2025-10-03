import { connectToDatabase } from "@/lib/db";
import { Booking, Partner } from "@/lib/models";
import { Lockassign, releaseLock, redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lockKey = `booking_assign:${id}`;

  try {
    const locked = await Lockassign(lockKey);
    if (!locked) {
      return NextResponse.json(
        { error: "Another admin is assigning this booking" },
        { status: 409 }
      );
    }

    await connectToDatabase();
    const booking = await Booking.findById(id);
    if (!booking) {
      await releaseLock(lockKey);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Fetch online partners in the same city
    const partners = await Partner.find({ city: booking.location, status: "online" });
    if (!partners.length) {
      await releaseLock(lockKey);
      return NextResponse.json({ error: "No available partners" }, { status: 400 });
    }

    // Find nearest partner
    const nearest = partners.reduce((prev, curr) => {
      const distPrev = Math.hypot(
        prev.location.lat - booking.address.latitude,
        prev.location.lng - booking.address.longitude
      );
      const distCurr = Math.hypot(
        curr.location.lat - booking.address.latitude,
        curr.location.lng - booking.address.longitude
      );
      return distCurr < distPrev ? curr : prev;
    });

    // Store assigned partner in Redis 
    await redis.set(`booking_partner:${id}`, nearest._id.toString());

    // Publish live event
    await redis.publish(
      "booking:assigned",
      JSON.stringify({ bookingId: id, partnerId: nearest._id })
    );

    await releaseLock(lockKey);

    return NextResponse.json({
      message: "Partner assigned successfully",
      partner: nearest,
    });
  } catch (err) {
    await releaseLock(lockKey);
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
