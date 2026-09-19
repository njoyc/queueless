import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function CustomerDashboard() {
  const { user } = useAuth();

  const [activeQueue, setActiveQueue] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(true);

  useEffect(() => {
    async function findActiveQueue() {
      try {
        const servicesResponse = await api.get(
          "/organizations/1/services"
        );

        const services = servicesResponse.data;

        const queueResults = await Promise.all(
          services.map(async (service) => {
            try {
              const response = await api.get(
                `/queue/${service.id}/status`
              );

              return {
                service,
                queue: response.data,
              };
            } catch {
              return null;
            }
          })
        );

        const active = queueResults.find(
          (result) =>
            result &&
            result.queue.my_token !== null &&
            result.queue.my_token !== undefined
        );

        setActiveQueue(active || null);
      } finally {
        setLoadingQueue(false);
      }
    }

    findActiveQueue();
  }, []);

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <p className="eyebrow">CUSTOMER DASHBOARD</p>

        <h1>
          Welcome back, {user?.name || "QueueLess"}.
        </h1>

        <p>
          Manage your appointments and keep track of your queue.
        </p>
      </div>

      <div className="dashboard-grid">

        {/* SERVICES */}
        <div className="dashboard-card">
          <span className="dashboard-icon">01</span>

          <h2>Find a Service</h2>

          <p>
            Browse available services and join a queue
            or book an appointment.
          </p>

          <Link to="/services" className="dashboard-link">
            Explore services →
          </Link>
        </div>

        {/* APPOINTMENTS */}
        <div className="dashboard-card">
          <span className="dashboard-icon">02</span>

          <h2>Appointments</h2>

          <p>
            View and manage your upcoming appointments.
          </p>

          <Link
            to="/appointments"
            className="dashboard-link"
          >
            View appointments →
          </Link>
        </div>

        {/* LIVE QUEUE */}
        <div className="dashboard-card featured-card">
          <span className="dashboard-icon">03</span>

          <h2>My Live Queue</h2>

          <p>
            Track your position and receive real-time
            queue updates.
          </p>

          {loadingQueue ? (
            <span className="dashboard-link">
              Checking queue...
            </span>
          ) : activeQueue ? (
            <Link
              to={`/queue/${activeQueue.service.id}`}
              className="dashboard-link"
            >
              View live queue →
            </Link>
          ) : (
            <Link
              to="/services"
              className="dashboard-link"
            >
              Join a queue →
            </Link>
          )}
        </div>

      </div>
    </section>
  );
}

export default CustomerDashboard;