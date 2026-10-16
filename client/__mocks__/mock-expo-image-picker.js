module.exports = {
  requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
  launchImageLibraryAsync: async () => ({ canceled: true }),
};
