import React, { useContext, useEffect, useState } from "react";
import ApiContext from "../../../Context/ApiContext";
import axios from "axios";
import {
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
  AiOutlineCloseCircle,
} from "react-icons/ai";

const Payment = () => {
  const { apiBaseUrl, token } = useContext(ApiContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const deriveSource = (payment) => {
    if (payment?.payment_source) return payment.payment_source;
    if (payment?.payment_purpose) return payment.payment_purpose;
    return "General";
  };

  const deriveMessage = (payment) => {
    if (payment?.order_status === "Failed") {
      return payment?.failure_message || payment?.status_message || "Payment failed";
    }
    if (payment?.order_status === "Pending") {
      return payment?.status_message || "Payment is pending confirmation";
    }
    return payment?.status_message || "Payment captured successfully";
  };

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        };
        const { data } = await axios.get(`${apiBaseUrl}payment`, config);

        setPayments(data);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [apiBaseUrl, token]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Success":
        return (
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <AiOutlineCheckCircle /> Success
          </span>
        );
      case "Pending":
        return (
          <span className="flex items-center gap-1 text-yellow-600 font-medium">
            <AiOutlineClockCircle /> Pending
          </span>
        );
      case "Failed":
        return (
          <span className="flex items-center gap-1 text-red-600 font-medium">
            <AiOutlineCloseCircle /> Failed
          </span>
        );
      case "Cancelled":
      case "Aborted":
        return (
          <span className="flex items-center gap-1 text-orange-600 font-medium">
            <AiOutlineCloseCircle /> {status}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // 🔍 Filter payments by search text
  const filteredPayments = payments.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.order_id?.toLowerCase().includes(term) ||
      p.order_status?.toLowerCase().includes(term) ||
      p.payment_mode?.toLowerCase().includes(term) ||
      deriveSource(p)?.toLowerCase().includes(term) ||
      deriveMessage(p)?.toLowerCase().includes(term)
    );
  });

  // 📄 Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // 💰 Total amount (only from successful transactions)
  const totalAmount = payments
    .filter((p) => p.order_status === "Success")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        💳 Payment History
      </h1>

      {/* Total Received */}
      <div className="mb-6 text-lg font-semibold text-green-700">
        Total Amount Received: ₹{totalAmount}
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Order ID, Status, or Mode..."
          className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1); // reset to first page
          }}
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading payments...</p>
      ) : payments.length === 0 ? (
        <p className="text-gray-500">No payments found.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-2xl">
          <table className="min-w-full text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-6 py-3 font-semibold">Order ID</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Currency</th>
                <th className="px-6 py-3 font-semibold">Source</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Message</th>
                <th className="px-6 py-3 font-semibold">Mode</th>
                <th className="px-6 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map((p) => (
                <tr
                  key={p._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 font-mono text-blue-600">
                    {p.order_id}
                  </td>
                  <td className="px-6 py-4 font-semibold">₹{p.amount}</td>
                  <td className="px-6 py-4">{p.currency}</td>
                  <td className="px-6 py-4">{deriveSource(p)}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(p.order_status)}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <span className="block truncate" title={deriveMessage(p)}>
                      {deriveMessage(p)}
                    </span>
                  </td>
                  <td className="px-6 py-4">{p.payment_mode || "-"}</td>
                  <td className="px-6 py-4">
                    {new Date(p.trans_date || p.createdAt).toLocaleString(
                      "en-IN",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      },
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-3 border-t">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Payment;
