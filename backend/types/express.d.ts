// types/express.d.ts
// Extiende los tipos de Express para incluir nuestro User en req.user

import { OAuthProfile } from '../config/oauth'

declare global {
  namespace Express {
    interface User {
      id: string
      email: string
    }

    interface Request {
      user?: User | OAuthProfile
    }
  }
}

export {}
