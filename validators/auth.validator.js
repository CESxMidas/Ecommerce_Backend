export function validateRegister(body) {
  const errors = [];
  const { name, email, password } = body;

  if (!name?.trim()) {
    errors.push("Name is required");
  }

  if (!email?.trim()) {
    errors.push("Email is required");
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.push("Invalid email format");
  }

  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }

  return errors;
}

export function validateLogin(body) {
  const errors = [];
  const { email, password } = body;

  if (!email?.trim()) {
    errors.push("Email is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  return errors;
}

export function validateForgotPassword(body) {
  const errors = [];
  const { email } = body;

  if (!email?.trim()) {
    errors.push("Email is required");
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.push("Invalid email format");
  }

  return errors;
}

export function validateResetPassword(body) {
  const errors = [];
  const { password, confirmPassword } = body;

  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }

  if (!confirmPassword) {
    errors.push("Please confirm password");
  } else if (password !== confirmPassword) {
    errors.push("Passwords do not match");
  }

  return errors;
}

export function validateVerify(body) {
  const errors = [];
  const { email, otp } = body;

  if (!email?.trim()) {
    errors.push("Email is required");
  }

  if (!otp?.trim()) {
    errors.push("OTP is required");
  }

  return errors;
}
