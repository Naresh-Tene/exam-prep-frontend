import axios from "axios";

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE_URL ||
    "https://exam-prep-backend-lwhw.onrender.com/api",
});

API.interceptors.request.use((req) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user?.token) {
      req.headers.Authorization = `Bearer ${user.token}`;
    }
  } catch (_) {}
  return req;
});

export default API;
