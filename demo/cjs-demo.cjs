const { log } = require("where-log");

const user = {
  id: 1,
  name: "Shovon",
  role: "admin",
  flags: { beta: true, premium: false },
};

log(user);
log("user", user);
log(user, { mode: "fast" });
log(user, { mode: "fast", includeLocation: false });
