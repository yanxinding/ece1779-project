function logJSON(obj) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...obj }));
}

logJSON({ level: "info", msg: "worker_started" });

setInterval(() => {
  logJSON({ level: "info", msg: "worker_heartbeat" });
}, 10000);
