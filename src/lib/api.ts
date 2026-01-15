// API Placeholders - to be wired to real endpoints later
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bxgstnspuebcjddeqohl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_juLM2PSJNCYLUzbN0V5JOg_h91nU6Zz";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Base URL would be configured via environment variable

const API_BASE = "/api";

// Simulated delay for realistic loading states
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Auth endpoints
export const authApi = {
  login: async (email: string, password: string) => {
    await delay(800);
    // POST /api/auth/login
    if (email && password) {
      return { user: { id: "1", email, name: "Admin User" }, token: "mock-token" };
    }
    throw new Error("Invalid credentials");
  },

  me: async () => {
    await delay(300);
    // GET /api/me
    return { id: "1", email: "admin@company.com", name: "Admin User" };
  },
};

// Products endpoints
export const productsApi = {
  getAll: async () => {
    await delay(500);
    // GET /api/products
    return { data: [] };
  },

  create: async (product: any) => {
    await delay(500);
    // POST /api/products
    return { data: { ...product, id: Date.now().toString() } };
  },

  update: async (id: string, product: any) => {
    await delay(500);
    // PUT /api/products/{id}
    return { data: { ...product, id } };
  },

  delete: async (id: string) => {
    await delay(500);
    // DELETE /api/products/{id}
    return { success: true };
  },
};

// Suppliers endpoints
export const suppliersApi = {
  getAll: async () => {
    await delay(500);
    // GET /api/suppliers
    return { data: [] };
  },

  create: async (supplier: any) => {
    await delay(500);
    // POST /api/suppliers
    return { data: { ...supplier, id: Date.now().toString() } };
  },

  update: async (id: string, supplier: any) => {
    await delay(500);
    // PUT /api/suppliers/{id}
    return { data: { ...supplier, id } };
  },

  delete: async (id: string) => {
    await delay(500);
    // DELETE /api/suppliers/{id}
    return { success: true };
  },
};

// Purchase Orders endpoints
export const poApi = {
  getAll: async () => {
    await delay(500);
    // GET /api/po
    return { data: [] };
  },

  getById: async (id: string) => {
    await delay(500);
    // GET /api/po/{id}
    return { data: null };
  },

  generate: async (items: any[]) => {
    await delay(1000);
    // POST /api/po/generate
    return {
      data: items.map((_, i) => ({
        id: Date.now().toString() + i,
        po_number: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
        status: "pending",
      })),
    };
  },

  getPdf: async (id: string) => {
    await delay(500);
    // GET /api/po/{id}/pdf
    return { url: `${API_BASE}/po/${id}/pdf` };
  },
};
