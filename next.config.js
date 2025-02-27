/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Augmenter la taille maximale des requêtes pour permettre l'upload de fichiers plus volumineux
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig