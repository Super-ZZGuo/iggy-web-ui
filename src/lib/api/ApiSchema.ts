import type { GlobalPermissions, StreamPermissions } from '$lib/domain/Permissions';
import type { KeysToSnakeCase } from '$lib/utils/utilTypes';

type Permissions = {
  global: KeysToSnakeCase<GlobalPermissions>;
  streams: Record<number, StreamPermissions>;
};

type Users =
  | { method: 'POST'; path: '/users/login'; body: { username: string; password: string } }
  | { method: 'POST'; path: '/users/logout' }
  | {
      method: 'POST';
      path: '/users';
      body: {
        username: string;
        password: string;
        status: 'active' | 'inactive';
        permissions: Permissions | null;
      };
    }
  | {
      method: 'GET';
      path: '/users';
    }
  | {
      method: 'GET';
      path: `/users/${number}`;
    }
  | {
      method: 'GET';
      path: `/users/${number}`;
      body: {
        username: string;
        status: 'active' | 'inactive';
        permissions: Permissions | null;
      };
    }
  | {
      method: 'PUT';
      path: `/users/${number}/password`;
      body: {
        current_password: string;
        new_password: string;
      };
    }
  | {
      method: 'PUT';
      path: `/users/${number}/permissions`;
      body: {
        permissions: Permissions;
      };
    }
  | {
      method: 'DELETE';
      path: `/users/${number}`;
    };

type Streams =
  | {
      method: 'GET';
      path: '/streams';
    }
  | {
      method: 'GET';
      path: `/streams/${number}`;
    }
  | {
      method: 'GET';
      path: `/streams/${number}/topics/${number}`;
    };

type Stats = {
  method: 'GET';
  path: '/stats';
};

export type ApiSchema = Users | Streams | Stats;