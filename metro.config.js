const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force jsPDF browser build
config.resolver.alias = {
  ...config.resolver.alias,
  jspdf: require.resolve('jspdf/dist/jspdf.umd.min.js'),
};

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  jspdf: require.resolve('jspdf/dist/jspdf.umd.min.js'),
};

module.exports = config;