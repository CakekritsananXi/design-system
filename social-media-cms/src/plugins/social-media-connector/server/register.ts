import { Strapi } from '@strapi/strapi';

export default ({ strapi }: { strapi: Strapi }) => {
  // Register plugin services and lifecycle hooks
  strapi.log.info('Social Media Connector plugin registered');
  
  // Initialize social media clients
  strapi.plugin('social-media-connector').service('facebook').initialize();
  strapi.plugin('social-media-connector').service('twitter').initialize();
  strapi.plugin('social-media-connector').service('linkedin').initialize();
  strapi.plugin('social-media-connector').service('youtube').initialize();
  strapi.plugin('social-media-connector').service('tiktok').initialize();
};
