interface AuthUser {
  sub: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
}

interface DbUser {
    id?: number;
    uuid: string;
    email: string;
    password: string;
    role?: string;
}