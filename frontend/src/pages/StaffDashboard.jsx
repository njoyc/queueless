import { useEffect, useState } from "react";
import api from "../services/api";

function StaffDashboard() {
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setError("");

      const servicesResponse = await api.get("/organizations/1/services");
      const serviceList = servicesResponse.data;

      setServices(serviceList);

      const queueResults = await Promise.all(
        serviceList.map(async (service) => {
          const response = await api.get(`/queue/${service.id}/status`);
          return [service.id, response.data];
        })
      );

      setQueues(Object.fromEntries(queueResults));
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to load staff dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function callNext(serviceId) {
    setBusy((prev) => ({ ...prev, [serviceId]: "calling" }));
    setError("");

    try {
      await api.post(`/queue/${serviceId}/next`);
      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not call the next customer."
      );
    } finally {
      setBusy((prev) => ({ ...prev, [serviceId]: null }));
    }
  }

  async function completeEntry(serviceId, entryId) {
    setBusy((prev) => ({ ...prev, [serviceId]: "completing" }));
    setError("");

    try {
      await api.post(`/queue/entry/${entryId}/complete`);
      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not complete the queue entry."
      );
    } finally {
      setBusy((prev) => ({ ...prev, [serviceId]: null }));
    }
  }

  if (loading) {
    return (
      <section className="dashboard-page">
        <p>Loading staff dashboard...</p>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <p className="eyebrow">STAFF CONSOLE</p>
        <h1>Manage live queues.</h1>
        <p>
          Call customers, track active queues, and complete appointments in
          real time.
        </p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="dashboard-grid">
        {services.map((service) => {
          const queue = queues[service.id];
          const isBusy = busy[service.id];

          return (
            <div className="dashboard-card" key={service.id}>
              <span className="dashboard-icon">
                {String(service.id).padStart(2, "0")}
              </span>

              <h2>{service.name}</h2>

              <div className="staff-stats">
                <div>
                  <span>WAITING</span>
                  <strong>{queue?.waiting_count ?? 0}</strong>
                </div>

                <div>
                  <span>NOW SERVING</span>
                  <strong>{queue?.current_token ?? "—"}</strong>
                </div>
              </div>

              {queue?.current_entry_id ? (
                <button
                  className="nav-button"
                  onClick={() =>
                    completeEntry(service.id, queue.current_entry_id)
                  }
                  disabled={isBusy}
                >
                  {isBusy === "completing"
                    ? "Completing..."
                    : "Complete Current →"}
                </button>
              ) : (
                <button
                  className="nav-button"
                  onClick={() => callNext(service.id)}
                  disabled={isBusy || queue?.waiting_count === 0}
                >
                  {isBusy === "calling" ? "Calling..." : "Call Next →"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default StaffDashboard;