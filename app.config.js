// Extends app.json. A web build served under a sub-path (GitHub Pages serves
// this repo at /chronicles) sets CHRONICLES_BASE_URL; local builds stay at the root.
module.exports = ({ config }) => {
  const baseUrl = process.env.CHRONICLES_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
