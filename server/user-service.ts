
// Firebase user service has been removed
// All user management is now handled through the regular authentication system

export class UserService {
  static async createOrUpdateUser() {
    return { success: false, error: 'UserService is disabled (Firebase removed)' };
  }

  static async getUserByUid(_uid: string) {
    return null;
  }

  static async getUserByEmail(_email: string) {
    return null;
  }

  static async getUserByPhone(_phoneNumber: string) {
    return null;
  }
}
