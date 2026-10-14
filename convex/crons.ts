import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run monitoring and gatekeeper checks every 30 minutes in the cloud 24/7
crons.interval(
  "gatekeeper-and-monitoring",
  { minutes: 30 },
  internal.cronsJob.runPeriodicMonitoring
);

export default crons;
