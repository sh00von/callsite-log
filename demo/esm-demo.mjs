import { log } from "where-log";

const project = {
  id: "p_101",
  title: "Text Editor",
  members: ["Shovon", "Rafi", "Nadia"],
  status: {
    stage: "development",
    done: false,
  },
};

log(project.title);