"use client";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { useEffect, useState } from "react";

interface Document {
  docType: string;
  docLink: string;
  status: string;
}

interface Booking {
  _id: string;
  location: string;
  document: Document[];
  partnerId?: string;
  address: { latitude: number; longitude: number };
  status: "PENDING" | "CONFIRMED" | "ASSIGNED";
  partnerName?: string;
}

export default function Home() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [partnerLocations, setPartnerLocations] = useState({});

  const handleOpenDialog = (id: string, doc: Document) => {
    setSelectedDoc(doc);
    setSelectedID(id);
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDoc(null);
    setSelectedID(null);
  };

  const fetchBookings = async () => {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.bookings);
  };

  useEffect(() => {
    const eventSource = new EventSource("/api/bookings/events");
    eventSource.onmessage = async (event) => {
      const rawData = event.data?.startsWith("data: ")
        ? event.data.substring(6).trim()
        : event.data;

      if (!rawData) {
        return;
      }

      const data = JSON.parse(rawData);

      if (data.channel === "booking:confirmed") {
        alert(`Booking is confirmed: ${data.id}`);
        await fetchBookings();
      } else if (data.channel === "booking:assigned") {
        alert(
          `Partner ${data.partnerId} assigned to Booking ${data.bookingId}.`
        );
        await fetchBookings();
      } else if (data.channel === "partner:location") {
        setPartnerLocations((prev) => ({
          ...prev,
          [data.id]: { name: data.name, lat: data.lat, lng: data.lng },
        }));
        console.log(`Live GPS update for Partner ${data.id}`);
      }

      console.log("SSE event received:", data);
    };

    fetchBookings();

    return () => eventSource.close();
  }, []);

  const handleApprove = async (docType: string) => {
    if (!selectedID) return;
    await fetch(`/api/bookings/${selectedID}/review`, {
      method: "POST",
      body: JSON.stringify({ docType, status: "APPROVED" }),
      headers: { "Content-Type": "application/json" },
    });
    fetchBookings();
    handleCloseDialog();
  };

  const handleConfirm = async (bookingId: string) => {
    await fetch(`/api/bookings/${bookingId}/confirm`, { method: "POST" });
    fetchBookings();
  };

  const handleAssignPartner = async (bookingId: string) => {
    await fetch(`/api/bookings/${bookingId}/assign`, { method: "POST" });
    fetchBookings();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bookings</h1>
      <table className="w-full border border-gray-300 text-center">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Booking ID</th>
            <th className="p-2 border">location</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Documents</th>
            <th className="p-2 border">Confirm Booking</th>
            <th className="p-2 border">Assign Partner</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b._id}>
              <td className="p-2 border">{b._id}</td>
              <td className="p-2 border">{b.location}</td>
              <td className="p-2 border">{b.status}</td>
              <td className="p-2 border">
                {b.document.map((doc: any) => (
                  <div
                    key={doc.docType}
                    className="flex justify-center gap-3 mb-2 items-center"
                  >
                    <span>
                      {doc.docType} -{" "}
                      {doc.status === "APPROVED" ? (
                        <span className="text-green-500">APPROVED</span>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenDialog(b._id, doc)}
                        >
                          Review
                        </Button>
                      )}
                    </span>
                  </div>
                ))}
              </td>

              <td className="p-2 border">
                <button
                  className={`px-3 py-1 rounded text-white bg-blue-600 hover:bg-blue-700" 
                  }`}
                  onClick={() => handleConfirm(b._id)}
                >
                  Confirm Booking
                </button>
              </td>

              <td className="p-2 border">
                {b.partnerName ? (
                  <span className="font-semibold text-green-700">
                    {b.partnerName}
                  </span>
                ) : (
                  <button
                    className={`px-3 py-1 rounded text-white ${
                      b.status === "CONFIRMED"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    disabled={b.status !== "CONFIRMED"}
                    onClick={() => handleAssignPartner(b._id)}
                  >
                    Assign
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-bold mt-8 mb-4">Live Partner Tracking</h2>
      <table className="w-full border border-gray-300 text-center">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Partner Name</th>
            <th className="p-2 border">Latitude</th>
            <th className="p-2 border">Longitude</th>
            <th className="p-2 border">Tracking Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(partnerLocations).map(([id, p]: any) => (
            <tr key={id}>
              <td className="p-2 border">{p.name}</td>
              <td className="p-2 border">{p.lat.toFixed(5)}</td>
              <td className="p-2 border">{p.lng.toFixed(5)}</td>
              <td className="p-2 border text-green-600">LIVE</td>
            </tr>
          ))}
          {Object.keys(partnerLocations).length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-gray-500">
                Awaiting live partner location data...
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Document Review Dialog */}
      {selectedDoc && (
        <DocumentReviewDialog
          open={openDialog}
          onClose={handleCloseDialog}
          onApprove={handleApprove}
          doc={selectedDoc}
        />
      )}
    </div>
  );
}

function DocumentReviewDialog({ open, onClose, onApprove, doc }: any) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Review Document: {doc.docType}</DialogTitle>
      <DialogContent>
        <img
          src={doc.docLink}
          alt={doc.docType}
          style={{ width: "100%", maxHeight: "400px", objectFit: "cover" }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onApprove(doc.docType)} color="primary">
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
