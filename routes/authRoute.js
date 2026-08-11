const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const {
  register,
  login
} = require("../controller/authController");
const { validateRequest } = require("../middlewares/validationMiddleware");

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("location").optional().isObject().withMessage("Location must be an object"),
    body("contactInfo").optional().isObject().withMessage("Contact info must be an object")
  ],
  validateRequest,
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  validateRequest,
  login
);

module.exports = router;