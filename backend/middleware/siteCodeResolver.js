// backend/middleware/siteCodeResolver.js
import { SITE_CODES } from "../constants/sites.js";

export function siteCodeResolver(req, res, next) {
  const { siteCode } = req.params;
  if (!SITE_CODES.includes(siteCode)) {
    return res
      .status(400)
      .json({ message: `Invalid site code. Allowed: ${SITE_CODES.join(", ")}` });
  }

  req.tenant = { siteCode };
  req.siteCode = siteCode;
  next();
}
