import jwt from 'jsonwebtoken';
import { Model } from 'sequelize-typescript'

export type DateInput = Date | string | number

/**
 * getIsoTimestamp
 * @param date
 * @returns date : string
 */
export const getIsoTimestamp = (date?: DateInput): string => {
  if (date) {
    return new Date(date).toISOString()
  }
  return new Date().toISOString()
}

/**
 * getDate (closure)
 * @param column
 * @returns Date: date | null
 */
export const getDate = function (column: string): () => Date | null {
  return function (this: Model) {
    const dataValue = this.getDataValue(column)
    if (!dataValue) {
      return null
    }
    return new Date(dataValue)
  }
}

/**
 * setDate (closure)
 * @param column: string
 * @returns Date
 */
export const setDate = function (column: string): (val: DateInput | null) => any {
  return function (this: Model, val: DateInput | null) {
    if (val === null) {
      return this.setDataValue(column, null)
    }
    return this.setDataValue(column, getIsoTimestamp(val))
  }
}

/**
 * toLowerCase (closure)
 * @param column: string
 * @returns val: string
 */
export const toLowerCase = function (column: string): (val: string) => any {
  return function (this: Model, val: string) {
    return this.setDataValue(column, val.toLowerCase())
  }
}

export const getUserFullName = function (): string {
  return `${this.firstName}  ${this.lastName}`
}



export const generateToken = function (user: any): string {
  const secretKey = process.env.JWT_SECRET;
  
  if (!secretKey) {
    throw new Error('JWT_SECRET must be set in environment variables');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  const payload = {
    email: user.email,
  };

  const token = jwt.sign(payload, secretKey, { expiresIn });

  return token;
}

export const generateRefreshToken = function (user: any): string {
  const refreshTokenSecretKey = process.env.JWT_SECRET;
  
  if (!refreshTokenSecretKey) {
    throw new Error('JWT_SECRET must be set in environment variables');
  }

  const expiresIn = '7d';

  const payload = {
    email: user.email,
  };

  const refreshToken = jwt.sign(payload, refreshTokenSecretKey, { expiresIn });

  return refreshToken;
};
