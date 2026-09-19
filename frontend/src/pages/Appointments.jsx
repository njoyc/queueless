import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Appointments() {
  const { user } = useAuth();

  const isStaff =
    user?.role === "staff" || user?.role === "admin";

  if (isStaff) {
    return <StaffAppointments />;
  }

  return <CustomerAppointments />;
}


/* =====================================================
   CUSTOMER
===================================================== */

function CustomerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);

  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    try {
      setError("");

      const [appointmentsResponse, servicesResponse] =
        await Promise.all([
          api.get("/appointments/"),
          api.get("/organizations/1/services"),
        ]);

      setAppointments(appointmentsResponse.data);
      setServices(servicesResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load appointments."
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
  loadData();
  }, []);

  async function bookAppointment(event) {
    event.preventDefault();

    setBooking(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/appointments/", {
        service_id: Number(serviceId),
        start_time: new Date(startTime).toISOString(),
      });

      setSuccess("Appointment booked successfully.");

      setServiceId("");
      setStartTime("");

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not book appointment."
      );
    } finally {
      setBooking(false);
    }
  }

  async function cancelAppointment(appointmentId) {
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/appointments/${appointmentId}/cancel`
      );

      setSuccess("Appointment cancelled.");

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not cancel appointment."
      );
    }
  }

  function getServiceName(serviceId) {
    const service = services.find(
      (item) => item.id === serviceId
    );

    return service?.name || `Service #${serviceId}`;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <section className="dashboard-page">
        <p>Loading appointments...</p>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <p className="eyebrow">APPOINTMENTS</p>

        <h1>Book your time.</h1>

        <p>
          Schedule a service in advance or manage your
          upcoming appointments.
        </p>
      </div>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="appointment-layout">
        <div className="dashboard-card appointment-form-card">
          <span className="dashboard-icon">BOOK</span>

          <h2>New appointment</h2>

          <form onSubmit={bookAppointment}>
            <label>Service</label>

            <select
              value={serviceId}
              onChange={(event) =>
                setServiceId(event.target.value)
              }
              required
            >
              <option value="">
                Select a service
              </option>

              {services.map((service) => (
                <option
                  key={service.id}
                  value={service.id}
                >
                  {service.name}
                </option>
              ))}
            </select>

            <label>Date & time</label>

            <input
              type="datetime-local"
              value={startTime}
              onChange={(event) =>
                setStartTime(event.target.value)
              }
              required
            />

            <button
              type="submit"
              className="nav-button"
              disabled={booking}
            >
              {booking
                ? "Booking..."
                : "Book Appointment →"}
            </button>
          </form>
        </div>

        <div>
          <div className="section-heading">
            <p className="eyebrow">
              YOUR APPOINTMENTS
            </p>

            <h2>Upcoming & recent</h2>
          </div>

          {appointments.length === 0 ? (
            <div className="dashboard-card">
              <h2>No appointments yet.</h2>
              <p>
                Book your first appointment using the form.
              </p>
            </div>
          ) : (
            <div className="appointment-list">
              {appointments.map((appointment) => (
                <div
                  className="dashboard-card appointment-card"
                  key={appointment.id}
                >
                  <div className="appointment-top">
                    <div>
                      <span className="dashboard-icon">
                        #{appointment.id}
                      </span>

                      <h2>
                        {getServiceName(
                          appointment.service_id
                        )}
                      </h2>
                    </div>

                    <span
                      className={`appointment-status ${appointment.status}`}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <p>
                    {formatDate(
                      appointment.start_time
                    )}
                  </p>

                  <p>
                    Ends{" "}
                    {formatDate(
                      appointment.end_time
                    )}
                  </p>

                  {appointment.status === "booked" && (
                    <button
                      className="cancel-button"
                      onClick={() =>
                        cancelAppointment(
                          appointment.id
                        )
                      }
                    >
                      Cancel appointment
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


/* =====================================================
   STAFF
===================================================== */

function StaffAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  async function loadAppointments() {
    try {
      setError("");

      const response = await api.get(
      `/appointments/staff/all?_=${Date.now()}`
      );

      setAppointments(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load appointments."
      );
    } finally {
      setLoading(false);
    }
  }

useEffect(() => {
  loadAppointments();
}, []);


  function formatDate(dateString) {
    return new Date(dateString).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function updateAppointment(
    appointmentId,
    action
  ) {
    setBusy(appointmentId);
    setError("");

    try {
      if (action === "cancel") {
        await api.patch(
          `/appointments/${appointmentId}/cancel`
        );
      }

      if (action === "complete") {
        await api.patch(
          `/appointments/${appointmentId}/complete`
        );
      }

      await loadAppointments();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not update appointment."
      );
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <section className="dashboard-page">
        <p>Loading appointments...</p>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <p className="eyebrow">
          APPOINTMENT MANAGEMENT
        </p>

        <h1>Manage scheduled visits.</h1>

        <p>
          View customer appointments and manage their
          status from one place.
        </p>
      </div>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="dashboard-card">
          <h2>No appointments.</h2>
          <p>
            Customer bookings will appear here.
          </p>
        </div>
      ) : (
        <div className="staff-appointment-list">
          {appointments.map((appointment) => (
            <div
              className="dashboard-card staff-appointment-card"
              key={appointment.id}
            >
              <div className="appointment-top">
                <div>
                  <span className="dashboard-icon">
                    #{appointment.id}
                  </span>

                  <h2>
                    {appointment.service_name}
                  </h2>
                </div>

                <span
                  className={`appointment-status ${appointment.status}`}
                >
                  {appointment.status}
                </span>
              </div>

              <div className="staff-appointment-info">
                <p>
                  <strong>Customer:</strong>{" "}
                  {appointment.user_name}
                </p>

                <p>
                  <strong>Email:</strong>{" "}
                  {appointment.user_email}
                </p>

                <p>
                  <strong>Starts:</strong>{" "}
                  {formatDate(
                    appointment.start_time
                  )}
                </p>

                <p>
                  <strong>Ends:</strong>{" "}
                  {formatDate(
                    appointment.end_time
                  )}
                </p>
              </div>

              {appointment.status === "booked" && (
                <div className="staff-appointment-actions">
                  <button
                    className="nav-button"
                    disabled={
                      busy === appointment.id
                    }
                    onClick={() =>
                      updateAppointment(
                        appointment.id,
                        "complete"
                      )
                    }
                  >
                    {busy === appointment.id
                      ? "Updating..."
                      : "Complete →"}
                  </button>

                  <button
                    className="cancel-button"
                    disabled={
                      busy === appointment.id
                    }
                    onClick={() =>
                      updateAppointment(
                        appointment.id,
                        "cancel"
                      )
                    }
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Appointments;