const CREATED_AT = "2026-07-11T04:00:00.000Z";

const users = {
  customer: {
    id: "user-customer-e2e",
    email: "customer@example.com",
    full_name: "Casey Customer",
    role: "customer",
    is_customer: true,
    data: { customer_id: "customer-e2e" },
    hasSeenCustomerPortalTutorial: true,
  },
  technician: {
    id: "user-technician-e2e",
    email: "technician@example.com",
    full_name: "Taylor Technician",
    role: "technician",
    is_customer: false,
    data: { is_customer: false },
  },
  employee: {
    id: "user-employee-e2e",
    email: "employee@example.com",
    full_name: "Emery Employee",
    role: "employee",
    is_customer: false,
    data: { is_customer: false },
  },
  admin: {
    id: "user-admin-e2e",
    email: "admin@example.com",
    full_name: "Alex Admin",
    role: "admin",
    is_customer: false,
    data: { is_customer: false },
  },
};

function initialCollections() {
  return {
    AppSetting: [],
    Attachment: [],
    AuditEvent: [
      {
        id: "audit-e2e-1",
        event_type: "booking_created",
        actor_name: "Casey Customer",
        summary: "E2E booking created",
        created_date: CREATED_AT,
      },
    ],
    BlogCategory: [],
    BlogLog: [],
    BlogPost: [],
    BlogSettings: [],
    BlogTag: [],
    BusinessProfile: [
      {
        id: "business-e2e",
        name: "On The Run Electrics",
        legal_name: "On The Run Electrics",
        email: "hello@ontherunelectrics.com.au",
        phone: "0415 505 908",
        address: "11 Lucinda Street, Woolloongabba QLD 4102",
        is_default: true,
      },
    ],
    BusinessSetting: [],
    Customer: [
      {
        id: "customer-e2e",
        customer_id: "customer-e2e",
        user_id: "user-customer-e2e",
        full_name: "Casey Customer",
        name: "Casey Customer",
        email: "customer@example.com",
        phone: "0412345678",
        phone_display: "0412 345 678",
        status: "active",
      },
    ],
    CustomerNote: [],
    CustomerProfile: [
      {
        id: "profile-e2e",
        auth_user_id: "user-customer-e2e",
        display_name: "Casey",
        full_name: "Casey Customer",
        email: "customer@example.com",
        phone_e164: "+61412345678",
      },
    ],
    Feedback: [],
    InventoryItem: [],
    InventoryUsage: [
      {
        id: "usage-e2e-1",
        job_id: "job-e2e-1",
        item_id: "product-e2e-1",
        item_name: "Brake pad set",
        qty_used: 1,
        unit_cost: 20,
        unit_sell: 24,
        markup_percentage: 20,
        customer_line_total: 24,
        source: "inventory",
      },
    ],
    Invoice: [
      {
        id: "invoice-e2e-1",
        job_id: "job-e2e-1",
        customer_id: "customer-e2e",
        number: "INV-E2E-1",
        amount: 104,
        currency: "AUD",
        status: "outstanding",
        invoiceVisibility: "customer_visible",
        line_items: [
          { description: "Labour", qty: 1, unit_price: 80, kind: "labour" },
          { description: "Brake pad set", qty: 1, unit_price: 24, kind: "part" },
        ],
      },
    ],
    Job: [
      {
        id: "job-e2e-1",
        job_id: "OTR-E2E-1",
        reference: "OTR-E2E-1",
        customer_id: "customer-e2e",
        customer_user_id: "user-customer-e2e",
        customer_name: "Casey Customer",
        customer_email: "customer@example.com",
        customer_phone: "0412 345 678",
        asset_id: "scooter-e2e-1",
        asset_label: "Segway Ninebot Max G30",
        issue_description: "Brake service required",
        service_type: "brakes",
        priority: "medium",
        status: "requested",
        payment_status: "outstanding",
        invoice_id: "invoice-e2e-1",
        checklist: [],
        intake: {
          make: "Segway",
          model: "Ninebot Max G30",
          issueOrService: "Brake service required",
        },
        created_date: CREATED_AT,
        updated_date: CREATED_AT,
      },
    ],
    JobCalendarEvent: [],
    JobNote: [],
    JobTemplate: [],
    Order: [],
    PhoneVerification: [],
    Product: [
      {
        id: "product-e2e-1",
        name: "E2E Brake Pad Set",
        description: "Replacement brake pads for smoke testing.",
        sku: "E2E-BRAKE-1",
        price: 29.95,
        currency: "AUD",
        active: true,
        in_stock: true,
        category_key: "brakes",
        category_label: "Brakes",
        supplier: "eScootNow",
      },
    ],
    PublicJobAccess: [],
    Quote: [
      {
        id: "quote-e2e-1",
        job_id: "job-e2e-1",
        customer_id: "customer-e2e",
        status: "sent",
        approval_status: "pending",
        diagnosis_notes: "Brake pads are worn and require replacement.",
        labour_estimate: 80,
        parts_estimate: 24,
        total: 104,
        currency: "AUD",
        line_items: [{ description: "Labour", qty: 1, unit_price: 80, kind: "labour" }],
        sent_date: CREATED_AT,
      },
    ],
    Scooter: [
      {
        id: "scooter-e2e-1",
        customer_id: "customer-e2e",
        customer_account_id: "customer-e2e",
        make: "Segway",
        model: "Ninebot Max G30",
        serial_number: "E2E-SERIAL-1",
      },
    ],
    ScooterModel: [],
    ServiceCategory: [
      { id: "category-e2e-1", key: "repairs", name: "Repairs", active: true, order: 1 },
    ],
    ServiceItem: [
      { id: "service-e2e-1", name: "Brake Repairs", category_key: "repairs", active: true, order: 1 },
      { id: "service-e2e-2", name: "General Servicing", category_key: "maintenance", active: true, order: 2 },
    ],
    SocialConnection: [],
    StaffProfile: [
      { id: "staff-e2e-1", user_id: "user-technician-e2e", full_name: "Taylor Technician", active: true },
    ],
    SyncState: [],
  };
}

const fixtureState = globalThis.__OTRE_E2E_STATE__ || {
  collections: initialCollections(),
  events: [],
  sequence: 100,
};
globalThis.__OTRE_E2E_STATE__ = fixtureState;
globalThis.__OTRE_E2E__ = fixtureState;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function currentRole() {
  return globalThis.localStorage?.getItem("otre:e2e:role") || "guest";
}

function currentUser() {
  return users[currentRole()] || null;
}

function record(type, payload = {}) {
  const event = { type, payload: clone(payload) };
  fixtureState.events.push(event);
  if (globalThis.localStorage) {
    const persisted = JSON.parse(globalThis.localStorage.getItem("otre:e2e:events") || "[]");
    persisted.push(event);
    globalThis.localStorage.setItem("otre:e2e:events", JSON.stringify(persisted));
  }
}

function collection(name) {
  fixtureState.collections[name] ||= [];
  return fixtureState.collections[name];
}

function matches(recordValue, filter = {}) {
  return Object.entries(filter || {}).every(([key, expected]) => {
    if (expected && typeof expected === "object" && "$in" in expected) {
      return expected.$in.includes(recordValue[key]);
    }
    return recordValue[key] === expected;
  });
}

function entity(name) {
  return {
    async list(_sort, limit = 500) {
      return clone(collection(name).slice(0, limit));
    },
    async filter(filter = {}, _sort, limit = 500) {
      return clone(collection(name).filter((item) => matches(item, filter)).slice(0, limit));
    },
    async get(id) {
      const item = collection(name).find((candidate) => candidate.id === id);
      if (!item) throw new Error(`${name} ${id} not found`);
      return clone(item);
    },
    async create(data) {
      const item = {
        ...clone(data),
        id: data.id || `${name.toLowerCase()}-e2e-${++fixtureState.sequence}`,
        created_date: data.created_date || CREATED_AT,
      };
      collection(name).push(item);
      record(`entity.${name}.create`, item);
      return clone(item);
    },
    async update(id, data) {
      const index = collection(name).findIndex((candidate) => candidate.id === id);
      if (index < 0) throw new Error(`${name} ${id} not found`);
      collection(name)[index] = { ...collection(name)[index], ...clone(data), updated_date: CREATED_AT };
      record(`entity.${name}.update`, { id, data });
      return clone(collection(name)[index]);
    },
    async delete(id) {
      const index = collection(name).findIndex((candidate) => candidate.id === id);
      if (index >= 0) collection(name).splice(index, 1);
      record(`entity.${name}.delete`, { id });
      return { id };
    },
  };
}

const entities = new Proxy({}, {
  get(_target, name) {
    return entity(String(name));
  },
});

function jobById(jobId) {
  return collection("Job").find((job) => job.id === jobId || job.job_id === jobId);
}

function quoteByJob(jobId) {
  return collection("Quote").find((quote) => quote.job_id === jobId);
}

function invoiceByJob(jobId) {
  return collection("Invoice").find((invoice) => invoice.job_id === jobId);
}

async function invoke(name, payload = {}) {
  record(`function.${name}`, payload);

  if (name === "createBooking") {
    return {
      data: {
        reference: "OTR-E2E-BOOKING",
        job_id: "job-e2e-booking",
        accountPath: "/register?customerFlow=1",
        trackingLink: "/track/e2e-token",
        linked: false,
      },
    };
  }

  if (name === "staffCreateJob") {
    const job = {
      id: `job-e2e-${++fixtureState.sequence}`,
      reference: `OTR-E2E-${fixtureState.sequence}`,
      customer_name: payload.intake.customerName,
      customer_email: payload.intake.customerEmail,
      customer_phone: payload.intake.customerPhone,
      asset_label: [payload.intake.make, payload.intake.model].filter(Boolean).join(" ") || "E2E scooter",
      issue_description: payload.intake.initial_issue_notes || "E2E staff intake",
      status: "booked",
      priority: payload.intake.priority || "medium",
      service_type: payload.intake.service_type || "general_repair",
      checklist: payload.template?.checklist || [],
      created_date: CREATED_AT,
    };
    collection("Job").push(job);
    return { data: { job: clone(job), reference: job.reference, is_new_customer: true } };
  }

  if (name === "jobActions") {
    const job = jobById(payload.jobId);
    if (!job) throw new Error("Job not found");
    if (payload.action === "change_status") job.status = payload.newStatus;
    if (payload.action === "reschedule") job.scheduled_date = payload.newDate;
    if (payload.action === "cancel") job.status = "cancelled";
    if (payload.action === "reopen") job.status = "booked";
    if (payload.action === "mark_ready") job.status = "ready_for_pickup";
    return { data: clone(job) };
  }

  if (name === "quoteActions") {
    let quote = quoteByJob(payload.jobId);
    if (payload.action === "save") {
      if (!quote) {
        quote = { id: `quote-e2e-${++fixtureState.sequence}`, job_id: payload.jobId };
        collection("Quote").push(quote);
      }
      Object.assign(quote, clone(payload.data || {}));
      quote.total = Number(quote.labour_estimate || 0) + Number(quote.parts_estimate || 0);
    }
    if (payload.action === "send" && quote) quote.status = "sent";
    if (payload.action === "set_approval" && quote) {
      quote.status = payload.approved ? "approved" : "rejected";
      quote.approval_status = quote.status;
    }
    if (payload.action === "ai_draft") {
      return { data: { diagnosis_notes: "E2E AI diagnosis", labour_hours: 1 } };
    }
    return { data: clone(quote) };
  }

  if (name === "invoiceActions") {
    let invoice = invoiceByJob(payload.jobId);
    if (payload.action === "create" && !invoice) {
      invoice = {
        id: `invoice-e2e-${++fixtureState.sequence}`,
        job_id: payload.jobId,
        number: `INV-E2E-${fixtureState.sequence}`,
        amount: payload.amount || 0,
        currency: "AUD",
        status: "outstanding",
        invoiceVisibility: "internal",
        line_items: clone(payload.lineItems || []),
      };
      collection("Invoice").push(invoice);
    }
    if (payload.action === "set_payment_status" && invoice) invoice.status = payload.status;
    if (payload.action === "send_to_customer" && invoice) invoice.invoiceVisibility = "customer_visible";
    if (payload.action === "set_visibility" && invoice) invoice.invoiceVisibility = payload.invoiceVisibility;
    if (payload.action === "update_line_items" && invoice) invoice.line_items = clone(payload.lineItems || []);
    return { data: clone(invoice) };
  }

  if (name === "invoicePdfActions") {
    const invoice = invoiceByJob(payload.jobId) || collection("Invoice")[0];
    if (payload.action === "email" && invoice) {
      invoice.invoiceVisibility = "customer_visible";
      invoice.invoiceSentAt = CREATED_AT;
    }
    return {
      data: {
        invoice: clone(invoice),
        pdfBase64: "JVBERi0xLjQKJUVPRgo=",
        fileName: "INV-E2E.pdf",
        invoiceNumber: invoice?.number || "INV-E2E",
        customerEmail: "customer@example.com",
        lineItems: clone(payload.invoiceDraft?.lineItems || invoice?.line_items || []),
      },
    };
  }

  if (name === "publicJobAccessActions") {
    const job = collection("Job")[0];
    const quote = collection("Quote")[0];
    const invoice = collection("Invoice")[0];
    if (payload.action === "quote_decision") {
      quote.status = payload.approved ? "approved" : "rejected";
      quote.approval_status = quote.status;
    }
    if (payload.action === "start_payment") {
      return { data: { url: "/e2e-checkout?flow=invoice" } };
    }
    return {
      data: {
        job: clone(job),
        quote: clone(quote),
        invoice: clone(invoice),
        notes: [],
        attachments: [],
        permissions: ["view_status", "view_quote", "quote_decision", "view_invoice", "pay_invoice", "add_note", "upload_file"],
      },
    };
  }

  if (name === "createInvoiceCheckout") {
    return { data: { url: "/e2e-checkout?flow=invoice" } };
  }

  if (name === "createStoreCheckout") {
    return { data: { url: "/e2e-checkout?flow=store", reference: "ORD-E2E-1" } };
  }

  if (name === "claimCustomerJobs") return { data: { linked: 1 } };
  if (name === "sendSignupPhoneOtp") return { data: { sent: true, masked_phone: "04•• ••• 678" } };
  if (name === "verifySignupPhoneOtp") return { data: { verified: true, phone_e164: "+61412345678" } };
  if (name === "bookingVerification") return { data: { sent: true, verified: true, activeJobs: clone(collection("Job")) } };
  if (name === "customerSettings") return { data: { customer: clone(collection("Customer")[0]), scooters: clone(collection("Scooter")), connections: [] } };
  if (name === "customerActions") return { data: { customers: clone(collection("Customer")), customer: clone(collection("Customer")[0]) } };
  if (name === "customerHistory") return { data: { linked: { jobs: clone(collection("Job")), invoices: clone(collection("Invoice")), scooters: clone(collection("Scooter")) }, timeline: [] } };
  if (name === "publicBlog") return { data: { posts: [], categories: [], tags: [], settings: null } };
  if (name === "blogAdminData") return { data: { posts: [], categories: [], tags: [], settings: null, logs: [] } };

  return { data: { success: true } };
}

export const base44 = {
  auth: {
    async isAuthenticated() {
      return Boolean(currentUser());
    },
    async me() {
      const user = currentUser();
      if (!user) {
        const error = new Error("Not authenticated");
        error.status = 401;
        throw error;
      }
      return clone(user);
    },
    async loginViaEmailPassword() {
      record("auth.loginViaEmailPassword");
      return clone(users.customer);
    },
    async loginWithProvider(provider) {
      record("auth.loginWithProvider", { provider });
      return clone(users.customer);
    },
    async register(data) {
      record("auth.register", data);
      return { token: "e2e-token", user: clone(users.customer) };
    },
    async verifyOtp() {
      record("auth.verifyOtp");
      return { access_token: "e2e-token", user: clone(users.customer) };
    },
    async resendOtp() {
      record("auth.resendOtp");
      return { sent: true };
    },
    async updateMe(data) {
      Object.assign(users.customer, clone(data));
      record("auth.updateMe", data);
      return clone(users.customer);
    },
    async resetPasswordRequest(data) {
      record("auth.resetPasswordRequest", data);
      return { sent: true };
    },
    async resetPassword(data) {
      record("auth.resetPassword", data);
      return { success: true };
    },
    setToken(token) {
      globalThis.localStorage?.setItem("base44_access_token", token);
    },
    logout() {
      record("auth.logout");
      globalThis.localStorage?.removeItem("base44_access_token");
    },
    redirectToLogin() {
      record("auth.redirectToLogin");
    },
  },
  entities,
  functions: { invoke },
  integrations: {
    Core: {
      async UploadFile() {
        record("integration.UploadFile");
        return { file_url: "https://example.invalid/e2e-upload" };
      },
      async InvokeLLM() {
        record("integration.InvokeLLM");
        return { response: "E2E assistant response" };
      },
      async SendEmail(data) {
        record("integration.SendEmail", data);
        return { sent: true };
      },
    },
  },
  agents: {
    async createConversation(data) {
      record("agent.createConversation", data);
      return { id: "conversation-e2e-1", messages: [] };
    },
    subscribeToConversation(_id, callback) {
      callback({ messages: [] });
      return () => {};
    },
    async addMessage(_conversation, message) {
      record("agent.addMessage", message);
      return message;
    },
  },
};
