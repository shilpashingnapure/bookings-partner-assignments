import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/lib/models";
import { Lockassign, redis, releaseLock } from "@/lib/redis";
import { NextResponse } from "next/server";


export async function POST(req: Request, { params }: { params: any }) {
  const { id } = await params;
  const lockKey = `booking_lock:${id}`;

  try {
    await connectToDatabase();

    const locked = await Lockassign(lockKey, 5000);
    if (!locked) {
      return NextResponse.json({ error: "Another admin is confirming this booking" }, { status: 409 });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      await releaseLock(lockKey);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const allApproved = booking.document.every((doc: any) => doc.status === "APPROVED");
    if (!allApproved) {
      await releaseLock(lockKey);
      return NextResponse.json({ error: "All documents must be approved" }, { status: 400 });
    }

    await redis.publish("booking:confirmed", JSON.stringify({ id }));

    await releaseLock(lockKey);

    return NextResponse.json({ message: "Booking confirmed", id });
  } catch (error: any) {
    await releaseLock(lockKey);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
