import { connectToDatabase } from "@/lib/db";
import { Booking, Partner } from "@/lib/models"; 
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();
    
    const bookings = await Booking.find({});
    const plainBookings = bookings.map(b => b.toObject()); 
    const bookingIds = plainBookings.map(b => b._id.toString());
    const redisKeys = bookingIds.map(id => `booking_partner:${id}`);

    const partnerIds = await redis.mget(redisKeys); 
    const assignedPartnerIds = partnerIds.filter((id): id is string => !!id);

    let partnerDetailsMap : any = {};
    
    if (assignedPartnerIds.length > 0) {
        const partnerDetails = await Partner.find({ 
            _id: { $in: assignedPartnerIds } 
        }).select('name');
        
        partnerDetailsMap = partnerDetails.reduce((map, partner) => {
            map[partner._id.toString()] = partner.toObject() as { name: string };
            return map;
        }, {} as  any);
    }

    const combinedBookings = plainBookings.map((booking, index) => {
        const partnerId = partnerIds[index]; 
        const partnerData = partnerId ? partnerDetailsMap[partnerId] : undefined; 
        const allApproved = booking.document.every((d: any) => d.status === "APPROVED");
        const isAssigned = !!partnerId;
        let statusForUI;
        if (isAssigned) {
            statusForUI = "ASSIGNED";
        } else if (allApproved) {
            statusForUI = "CONFIRMED";
        } else {
            statusForUI = "PENDING";
        }

        return {
            ...booking, 
            partnerId: partnerId || undefined, 
            partnerName: partnerData ? partnerData.name : undefined,
            status: statusForUI, 
        };
    });

    return NextResponse.json({ bookings: combinedBookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}