const createClient = (supabaseUrl, supabaseKey) => {
  return {
    from: (table) => ({
      select: (fields) => ({
        limit: (n) => ({
          single: async () => ({
            data: {
              id: '1234567',
              name: 'Alex Knight',
              email: 'ak23@calvin.edu',
            },
            error: null,
          }),
        }),
      }),
    }),
  };
};

module.exports = {
  createClient,
};
