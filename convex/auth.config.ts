// Convex Auth issues its own tokens, so the deployment is its own identity provider.
const authConfig = {
  providers: [{ domain: process.env.CONVEX_SITE_URL, applicationID: "convex" }],
};

export default authConfig;
