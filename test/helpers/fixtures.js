export const TEST_USER = {
  name: "QA Test User",
  email: "qa.test.user@keyshop.test",
  password: "Test@123456",
};

export const TEST_PRODUCTS = {
  digital: {
    productId: 990001,
    name: "QA Windows Key Test",
    slug: "qa-windows-key-test",
    price: 250000,
    discountPrice: 199000,
    stock: 50,
    productType: "manual_service",
    deliveryType: "manual_delivery",
    requiresOnlinePayment: true,
    categoryName: "Windows",
    vendor: "KEYSHOP QA",
    isActive: true,
  },
  physical: {
    productId: 990002,
    name: "QA USB Installer Test",
    slug: "qa-usb-installer-test",
    price: 150000,
    stock: 20,
    productType: "hardware",
    deliveryType: "physical",
    requiresOnlinePayment: false,
    categoryName: "Phần cứng",
    vendor: "KEYSHOP QA",
    isActive: true,
  },
};

export const INVALID_PAYLOADS = {
  loginMissingEmail: { email: "", password: "secret" },
  loginWrongPassword: { email: TEST_USER.email, password: "wrong-password" },
  registerWeakPassword: {
    name: "Bad User",
    email: "bad@keyshop.test",
    password: "123",
  },
  orderEmptyItems: {
    name: TEST_USER.name,
    email: TEST_USER.email,
    phone: "+84901234567",
    address: "123 QA Street, HCM",
    items: [],
  },
};
