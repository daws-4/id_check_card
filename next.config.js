const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ['pruebas.davidvillamizar.com'],
  turbo: {
    root: path.resolve(__dirname),
  },
};

module.exports = nextConfig;
