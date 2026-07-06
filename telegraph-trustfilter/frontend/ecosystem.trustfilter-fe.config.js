module.exports = {
  apps: [{
    name: "trustfilter-fe",
    cwd: "/home/ubuntu/telegraph-usecases/telegraph-trustfilter/frontend",
    script: "node_modules/vite/bin/vite.js",
    args: "preview --host 0.0.0.0 --port 4103",
  }]
};
