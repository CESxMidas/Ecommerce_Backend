export function validatePlaceOrder(body) {
  const errors = [];
  const { name, email, phone, address, total } = body;

  if (!name?.trim()) {
    errors.push("Name is required");
  }

  if (!email?.trim()) {
    errors.push("Email is required");
  }

  if (!phone?.trim()) {
    errors.push("Phone is required");
  }

  if (!address?.trim()) {
    errors.push("Address is required");
  }

  if (total === undefined || total === null || Number.isNaN(Number(total))) {
    errors.push("Total is required");
  }

  return errors;
}
