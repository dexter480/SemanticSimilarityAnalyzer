// For this application, we don't need persistent storage
// All data is processed in memory for security reasons

export interface IStorage {
  // No storage methods needed - all processing is stateless
}

export class MemStorage implements IStorage {
  constructor() {
    // No persistent storage needed
  }
}

export const storage = new MemStorage();
