import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { FindOptions } from 'sequelize/types';
import { User } from '../../../db/models/user.model';
import { CreateUserInput, UpdateUserInput, UserOrm, UserRoles } from '../../types/user.types';

class UserRepository {
  public authenticateUser: (email: string, password: string, deviceId: string, fcmToken: string) => Promise<UserOrm | null>;
  public createUser: (userData: CreateUserInput, deviceId: string, fcmToken: string) => Promise<UserOrm>;
  public deleteUserById: (id: string) => Promise<boolean>;
  public getUserById: (id: string) => Promise<UserOrm | null>;
  public getUserByToken: (token: string) => Promise<UserOrm | null>;
  public getUsers: (where: FindOptions) => Promise<UserOrm[]>;
  public getStudents: (where: FindOptions) => Promise<UserOrm[]>;
  public updateUserById: (id: string, updateData: UpdateUserInput) => Promise<UserOrm | null>;
  public validateRefreshToken: (email: string) => Promise<UserOrm | null>;
  public getStudentsInCourseActivity: (courseId: string, activityId: string) => Promise<UserOrm[]>;
  public getStudentInCourseActivity: (activityId: string, studentId: string) => Promise<UserOrm>;
  public getStudentsDeviceTokensForCourse: (courseId: string) => Promise<UserOrm[]>;

  constructor() {
    this.authenticateUser = this._authenticateUser.bind(this);
    this.createUser = this._createUser.bind(this);
    this.deleteUserById = this._deleteUserById.bind(this);
    this.getUserById = this._getUserById.bind(this);
    this.getUserByToken = this._getUserByToken.bind(this);
    this.getUsers = this._getUsers.bind(this);
    this.getStudents = this._getStudents.bind(this);
    this.updateUserById = this._updateUserById.bind(this);
    this.validateRefreshToken = this._validateRefreshToken.bind(this);
  }

  private async _authenticateUser(
    userEmail: string,
    password: string,
    deviceId: string,
    fcmToken: string
  ): Promise<UserOrm | null> {
    try {
      const email = userEmail.toLocaleLowerCase();
      const user = await User.findOne({ where: { email } });

      if (!user || !deviceId || !fcmToken) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      // Update the user's FCM token and device ID
      await user.update({ fcmToken, deviceId });

      return user as UserOrm;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  public async _validateRefreshToken(userEmail: string): Promise<UserOrm | null> {
    try {
      const user = await User.findOne({ where: { email: userEmail } });

      if (!user) {
        return null;
      }

      return user as UserOrm;
    } catch (error) {
      throw new Error(`Error validating refresh token: ${error.message}`);
    }
  }

  private async _getUsers(where: FindOptions): Promise<UserOrm[]> {
    try {
      const users = await User.findAll(where);
      return users as UserOrm[];
    } catch (error) {
      throw new Error(`Failed to retrieve users: ${error.message}`);
    }
  }

  private async _getStudents(where: FindOptions): Promise<UserOrm[]> {
    try {
      const students = await User.findAll(where);
      return students as UserOrm[];
    } catch (error) {
      throw new Error(`Error fetching students: ${error.message}`);
    }
  }

  private async _getUserByToken(token: string): Promise<UserOrm | null> {
    try {
      const secretKey = process.env.JWT_SECRET;
      if (!secretKey) {
        throw new Error('JWT_SECRET must be set in environment variables');
      }
      const decoded = jwt.verify(token, secretKey);

      const userEmail = decoded['email'];

      const user = await User.findOne({ where: { email: userEmail } });

      if (!user) {
        throw new Error('User not found');
      }

      return user as UserOrm;
    } catch (error) {
      throw new Error('Unable to authenticate user');
    }
  }

  private async _getUserById(id: string): Promise<UserOrm | null> {
    try {
      const user = await User.findOne({ where: { id: parseInt(id) } });
      return user as UserOrm | null;
    } catch (error) {
      throw new Error('Unable to authenticate user');
    }
  }

  private async _createUser(
    userData: CreateUserInput,
    deviceId: string,
    fcmToken: string
  ): Promise<UserOrm> {
    try {
      if (!deviceId || !fcmToken) {
        throw new Error('Device ID and FCM token are required');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const userCreationData: any = {
        email: userData.email.toLocaleLowerCase(),
        fullName: userData.fullName,
        fullNameEnglish: userData.fullNameEnglish,
        userNumber: userData.userNumber || `USR${Date.now()}`,
        password: hashedPassword,
        userRoleId: userData.userRoleId || 1,
        fcmToken: fcmToken,
        deviceId: deviceId,
      };

      if (userData.mobileNumber) {
        userCreationData.mobileNumber = userData.mobileNumber;
      }
      if (userData.countryCode) {
        userCreationData.countryCode = userData.countryCode;
      }
      if (userData.username) {
        userCreationData.username = userData.username;
      }
      if (userData.companyId) {
        userCreationData.companyId = userData.companyId;
      }

      const newUser = await User.create(userCreationData);
      return newUser as UserOrm;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  private async _updateUserById(id: string, updateData: UpdateUserInput): Promise<UserOrm | null> {
    try {
      const user = await User.findOne({ where: { id: parseInt(id) } });
      if (user) {
        const updatePayload: any = { ...updateData };
        if (updateData.password) {
          const salt = await bcrypt.genSalt(10);
          updatePayload.password = await bcrypt.hash(updateData.password, salt);
        }
        if (updateData.email) {
          updatePayload.email = updateData.email.toLowerCase();
        }

        await user.update(updatePayload);
        return user as UserOrm;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to update user with ID ${id}: ${error.message}`);
    }
  }

  private async _deleteUserById(id: string): Promise<boolean> {
    try {
      const deleted = await User.destroy({ where: { id: parseInt(id) } });
      return deleted > 0;
    } catch (error) {
      throw new Error(`Failed to delete user with ID ${id}: ${error.message}`);
    }
  }
}

export default UserRepository;


