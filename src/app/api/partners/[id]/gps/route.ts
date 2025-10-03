import { connectToDatabase } from "@/lib/db";
import { Partner } from "@/lib/models";
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req : Request, { params } : { params: any }) {
  const { id: partnerId } = await params;
  const { lat, lng } = await req.json();
  const currentMinute = new Date().getMinutes();
  const rateLimitKey = `rate:gps:${partnerId}:${currentMinute}`;
  
  try {
 
    const [count] : any = await redis.multi()
      .incr(rateLimitKey)
      .expire(rateLimitKey, 60) 
      .exec();

    if (count > 6) {
      return NextResponse.json({ error: "Rate limit exceeded (Max 6/min)" }, { status: 429 });
    }

    await connectToDatabase();
    
    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      { "location.lat": lat, "location.lng": lng },
      { new: true }
    );

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    await redis.publish(
      "partner:location",
      JSON.stringify({ id: partnerId, name : partner.name, lat, lng })
    );

    return NextResponse.json({ message: "GPS updated", location: { lat, lng } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}