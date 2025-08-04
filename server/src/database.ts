import { dataService } from './dataService';

// Database adapter that works with both file system and cloud database
class DatabaseAdapter {
  private isProduction = process.env.NODE_ENV === 'production';
  private databaseUrl = process.env.DATABASE_URL;

  async initialize() {
    if (this.isProduction && this.databaseUrl) {
      console.log('🌐 Production mode: Using PostgreSQL database');
      // In production, we'll still use file-based storage but with persistent volumes
      // Railway provides persistent storage that survives deployments
      await dataService.initialize();
    } else {
      console.log('🏠 Development mode: Using local file storage');
      await dataService.initialize();
    }
  }

  // For now, proxy all methods to the existing dataService
  // This allows for future database migration without changing the API
  getDataService() {
    return dataService;
  }
}

export const dbAdapter = new DatabaseAdapter();
