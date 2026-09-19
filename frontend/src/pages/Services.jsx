import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await api.get("/organizations/1/services");
        setServices(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail || "Failed to load services."
        );
      } finally {
        setLoading(false);
      }
    }

    loadServices();
  }, []);

  async function joinQueue(serviceId) {
    setJoining(serviceId);
    setError("");

    try {
      await api.post("/queue/join", {
        service_id: serviceId,
      });

      navigate(`/queue/${serviceId}`);
    } catch (err) {
    const detail = err.response?.data?.detail;

    if (detail === "You are already in this queue") {
        navigate(`/queue/${serviceId}`);
        return;
    }

    setError(detail || "Could not join queue.");
    } finally {
      setJoining(null);
    }
  }

  if (loading) {
    return (
      <section className="dashboard-page">
        <p>Loading services...</p>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <p className="eyebrow">AVAILABLE SERVICES</p>
        <h1>Choose a service.</h1>
        <p>
          Join a live queue or book an appointment without waiting
          around.
        </p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="dashboard-grid">
        {services.map((service) => (
          <div className="dashboard-card" key={service.id}>
            <span className="dashboard-icon">
              {String(service.id).padStart(2, "0")}
            </span>

            <h2>{service.name}</h2>

            <p>
              {service.description || "Available service."}
            </p>

            <p>
              {service.duration_minutes} min · ₹{service.price}
            </p>

            <button
              className="nav-button"
              onClick={() => joinQueue(service.id)}
              disabled={joining === service.id}
            >
              {joining === service.id
                ? "Joining..."
                : "Join Queue →"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Services;