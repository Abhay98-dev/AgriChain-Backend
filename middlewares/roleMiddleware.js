const requireRole = (allowedRoles) => {

  return (req, res, next) => {

    try {

      // ensure auth middleware ran first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const userRole = req.user.role;

      // convert single role → array
      const roles = Array.isArray(allowedRoles)
        ? allowedRoles
        : [allowedRoles];

      // check if role allowed
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: insufficient permissions"
        });
      }

      next();

    } catch (error) {

      console.error("Role Middleware Error:", error);

      return res.status(500).json({
        success: false,
        message: "Role validation failed"
      });

    }

  };

};

module.exports = {requireRole};