import { Navigate } from "react-router-dom";

export default function GuestBooking() {
  return <Navigate to={`/book${window.location.search}`} replace />;
}
