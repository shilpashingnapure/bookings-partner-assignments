import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/lib/models";
import { Lockassign, releaseLock } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: any) {
const {id}  = await params;
  const { docType, status } = await req.json();
  const lockKey = `booking:${id}`;

  console.log(id, docType, status);

  try {

    if (!id || !docType || !status) {
      return NextResponse.json({ error: "Missing required fields" });
    }

    await connectToDatabase();
    const locked = await Lockassign(lockKey);
    if (!locked) {
      return NextResponse.json({
        error: "Another user is already processing this booking",
      });
    }

    


    const booking = await Booking.findById(id);
    if (!booking) {
      await releaseLock(lockKey);
      return NextResponse.json({ error: "Booking not found" });
    }

    

    const doc = booking.document.find((doc: any) => doc.docType === docType);
    if (!doc) {
      await releaseLock(lockKey);
      return NextResponse.json({ error: "Document not found" });
    }

    if (doc.status === status) {
        await releaseLock(lockKey); 
        return NextResponse.json({
            message: `Document is already ${status}`,
            booking,
        });
    }

    doc.status = status;
    booking.markModified("document");
    await booking.save();
    await releaseLock(lockKey);
    return NextResponse.json({
      message: "Document processed successfully",
      booking,
    });
  } catch (error) {
    console.error(error);
    await releaseLock(lockKey);
    return NextResponse.json({ error: "Internal server error" });
  }
}
