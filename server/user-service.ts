
import { db } from './storage';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface CreateUserData {
  uid: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  provider: 'google' | 'phone';
  photoURL?: string;
}

export class UserService {
  static async createOrUpdateUser(userData: CreateUserData) {
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.uid, userData.uid))
        .limit(1);

      if (existingUser.length > 0) {
        // Update existing user
        const updated = await db
          .update(users)
          .set({
            email: userData.email || existingUser[0].email,
            phoneNumber: userData.phoneNumber || existingUser[0].phoneNumber,
            displayName: userData.displayName || existingUser[0].displayName,
            photoURL: userData.photoURL || existingUser[0].photoURL,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, userData.uid))
          .returning();

        return { success: true, user: updated[0], isNew: false };
      } else {
        // Create new user
        const newUser = await db
          .insert(users)
          .values({
            uid: userData.uid,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            provider: userData.provider,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return { success: true, user: newUser[0], isNew: true };
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserByUid(uid: string) {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.uid, uid))
        .limit(1);

      return user.length > 0 ? user[0] : null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  static async getUserByEmail(email: string) {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return user.length > 0 ? user[0] : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  static async getUserByPhone(phoneNumber: string) {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, phoneNumber))
        .limit(1);

      return user.length > 0 ? user[0] : null;
    } catch (error) {
      console.error('Error fetching user by phone:', error);
      return null;
    }
  }
}
