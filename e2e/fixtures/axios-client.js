export function createAxiosClient() {
  return {
    async get() {
      return {
        id: "otre-e2e",
        public_settings: {
          auth_required: false,
        },
      };
    },
  };
}
